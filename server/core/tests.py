from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import (
    Team,
    Member,
    SSHKey,
    Project,
    ServerGroup,
    Server,
    Assignment,
)
from .provision import generate_provision_script


class ModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("modeltest", "pw")
        self.ws = self.user.sanctum_workspace

    def test_team_str(self):
        t = Team.objects.create(name="DevOps", workspace=self.ws)
        self.assertEqual(str(t), "DevOps")

    def test_member_teams_m2m(self):
        t1 = Team.objects.create(name="A", workspace=self.ws)
        t2 = Team.objects.create(name="B", workspace=self.ws)
        m = Member.objects.create(username="alice", workspace=self.ws)
        m.teams.set([t1, t2])
        self.assertEqual(m.teams.count(), 2)

    def test_server_group_regenerate_token(self):
        sg = ServerGroup.objects.create(name="prod", workspace=self.ws)
        old_token = sg.provision_token
        sg.regenerate_token()
        sg.refresh_from_db()
        self.assertNotEqual(sg.provision_token, old_token)

    def test_assignment_unique_together(self):
        t = Team.objects.create(name="Dev", workspace=self.ws)
        sg = ServerGroup.objects.create(name="staging", workspace=self.ws)
        Assignment.objects.create(team=t, server_group=sg, role="user")
        with self.assertRaises(Exception):
            Assignment.objects.create(team=t, server_group=sg, role="sudo")


class ProvisionScriptTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("provtest", "pw")
        self.ws = self.user.sanctum_workspace
        self.sg = ServerGroup.objects.create(name="production", workspace=self.ws)
        self.team_dev = Team.objects.create(name="Dev", workspace=self.ws)
        self.team_ops = Team.objects.create(name="Ops", workspace=self.ws)

        self.alice = Member.objects.create(
            username="alice", email="alice@test.com", workspace=self.ws
        )
        self.alice.teams.add(self.team_dev)
        SSHKey.objects.create(
            member=self.alice,
            label="laptop",
            public_key="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest alice@laptop",
        )

        self.bob = Member.objects.create(username="bob", workspace=self.ws)
        self.bob.teams.add(self.team_ops)
        SSHKey.objects.create(
            member=self.bob,
            label="work",
            public_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABKey1 bob@work",
        )
        SSHKey.objects.create(
            member=self.bob,
            label="home",
            public_key="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKey2 bob@home",
        )

    def test_script_contains_user_entries(self):
        Assignment.objects.create(team=self.team_dev, server_group=self.sg, role="user")
        Assignment.objects.create(team=self.team_ops, server_group=self.sg, role="sudo")

        script = generate_provision_script(self.sg)
        self.assertIn("ensure_user alice user", script)
        self.assertIn("ensure_user bob sudo", script)

    def test_script_removed_role(self):
        self.team_removed = Team.objects.create(name="Gone", workspace=self.ws)
        charlie = Member.objects.create(username="charlie", workspace=self.ws)
        charlie.teams.add(self.team_removed)
        Assignment.objects.create(
            team=self.team_removed, server_group=self.sg, role="removed"
        )

        script = generate_provision_script(self.sg)
        self.assertIn("remove_user", script)
        self.assertIn("charlie", script)

    def test_script_skips_member_without_keys(self):
        nokey = Member.objects.create(username="nokey", workspace=self.ws)
        nokey.teams.add(self.team_dev)
        Assignment.objects.create(team=self.team_dev, server_group=self.sg, role="user")

        script = generate_provision_script(self.sg)
        self.assertIn("SKIPPED nokey", script)

    def test_sudo_wins_over_user(self):
        """Member in two teams: one user, one sudo -> effective is sudo."""
        self.alice.teams.add(self.team_ops)
        Assignment.objects.create(team=self.team_dev, server_group=self.sg, role="user")
        Assignment.objects.create(team=self.team_ops, server_group=self.sg, role="sudo")

        script = generate_provision_script(self.sg)
        self.assertIn("ensure_user alice sudo", script)

    def test_empty_server_group(self):
        script = generate_provision_script(self.sg)
        self.assertIn("#!/usr/bin/env bash", script)
        desired_idx = script.index("# --- Desired State ---")
        cleanup_idx = script.index("# --- Cleanup:")
        desired_section = script[desired_idx:cleanup_idx]
        self.assertNotIn("ensure_user", desired_section)
        self.assertNotIn("remove_user", desired_section)

    def test_cleanup_section_lists_known_users(self):
        """Cleanup pass should list all desired-state usernames so stale OS users
        left behind by earlier runs get locked on the next cron."""
        Assignment.objects.create(team=self.team_dev, server_group=self.sg, role="user")
        Assignment.objects.create(team=self.team_ops, server_group=self.sg, role="sudo")

        script = generate_provision_script(self.sg)
        self.assertIn("KNOWN_USERS=", script)
        self.assertIn("|alice|", script)
        self.assertIn("|bob|", script)
        self.assertIn("remove_user", script)

    def test_cleanup_excludes_removed_member_no_longer_assigned(self):
        """When a member is simply removed from a team (not globally revoked),
        they should NOT appear in KNOWN_USERS — the cleanup pass will lock them."""
        Assignment.objects.create(team=self.team_dev, server_group=self.sg, role="user")
        # alice is in team_dev -> she's in the script
        script = generate_provision_script(self.sg)
        self.assertIn("|alice|", script)

        # bob is NOT assigned to any team on this environment
        self.assertNotIn("|bob|", script)

    def test_cleanup_empty_when_no_assignments(self):
        """With zero assignments the known-users string is empty (|)."""
        script = generate_provision_script(self.sg)
        self.assertIn('KNOWN_USERS="|"', script)

    def test_cleanup_includes_removed_role_in_known(self):
        """Users with role=removed are still in KNOWN_USERS (the explicit
        remove_user call handles them; cleanup should not double-process)."""
        charlie = Member.objects.create(username="charlie", workspace=self.ws)
        Assignment.objects.create(member=charlie, server_group=self.sg, role="removed")

        script = generate_provision_script(self.sg)
        self.assertIn("|charlie|", script)

    def test_cleanup_recognises_legacy_markers(self):
        """Cleanup should also catch users managed by predecessor tools
        (e.g. Userify) whose authorized_keys uses a different marker."""
        script = generate_provision_script(self.sg)
        self.assertIn('LEGACY_MARKERS=("# Generated by userify")', script)
        self.assertIn("is_managed", script)

    def test_script_is_idempotent_structure(self):
        Assignment.objects.create(team=self.team_dev, server_group=self.sg, role="user")
        script = generate_provision_script(self.sg)
        self.assertIn("set -euo pipefail", script)
        self.assertIn("MANAGED BY SANCTUM", script)


class APITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="admin")
        self.ws = self.user.sanctum_workspace
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_teams_crud(self):
        res = self.client.post("/api/teams/", {"name": "Backend"}, format="json")
        self.assertEqual(res.status_code, 201)
        team_id = res.data["id"]

        res = self.client.get("/api/teams/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

        res = self.client.put(
            f"/api/teams/{team_id}/",
            {"name": "Backend Team", "description": "Updated"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)

        res = self.client.delete(f"/api/teams/{team_id}/")
        self.assertEqual(res.status_code, 204)

    def test_team_detail_includes_members(self):
        team = Team.objects.create(name="Ops", workspace=self.ws)
        m = Member.objects.create(username="u1", workspace=self.ws)
        m.teams.add(team)
        res = self.client.get(f"/api/teams/{team.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("members", res.data)
        self.assertEqual(len(res.data["members"]), 1)
        self.assertEqual(res.data["members"][0]["username"], "u1")

    def test_team_add_and_remove_member(self):
        team = Team.objects.create(name="Ops", workspace=self.ws)
        m = Member.objects.create(username="u2", workspace=self.ws)
        res = self.client.post(
            f"/api/teams/{team.id}/members/",
            {"member": m.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["members"]), 1)
        self.assertTrue(m.teams.filter(pk=team.id).exists())

        res = self.client.delete(f"/api/teams/{team.id}/members/{m.id}/")
        self.assertEqual(res.status_code, 204)
        m.refresh_from_db()
        self.assertFalse(m.teams.filter(pk=team.id).exists())

    def test_members_with_teams(self):
        t = Team.objects.create(name="Dev", workspace=self.ws)
        res = self.client.post(
            "/api/members/",
            {"username": "alice", "email": "a@b.com", "team_ids": [t.id]},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["teams"][0]["name"], "Dev")

    def test_member_add_key(self):
        m = Member.objects.create(username="bob", workspace=self.ws)
        res = self.client.post(
            f"/api/members/{m.id}/keys/",
            {"label": "laptop", "public_key": "ssh-ed25519 AAAA test"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(m.ssh_keys.count(), 1)

    def test_member_generate_key(self):
        m = Member.objects.create(username="dave", workspace=self.ws)
        res = self.client.post(
            f"/api/members/{m.id}/generate-key/",
            {"label": "generated"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("private_key", res.data)
        self.assertIn("public_key", res.data)
        self.assertTrue(res.data["private_key"].startswith("-----BEGIN OPENSSH PRIVATE KEY-----"))
        self.assertTrue(res.data["public_key"].startswith("ssh-ed25519 "))
        self.assertEqual(m.ssh_keys.count(), 1)
        saved_key = m.ssh_keys.first()
        self.assertEqual(saved_key.public_key, res.data["public_key"])

    def test_member_remove_key(self):
        m = Member.objects.create(username="carol", workspace=self.ws)
        key = SSHKey.objects.create(member=m, label="old", public_key="ssh-rsa AAA old")
        res = self.client.delete(f"/api/members/{m.id}/keys/{key.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertEqual(m.ssh_keys.count(), 0)

    def test_server_groups_crud(self):
        res = self.client.post(
            "/api/server-groups/", {"name": "production"}, format="json"
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("provision_token", res.data)
        gid = res.data["id"]

        res = self.client.post(f"/api/server-groups/{gid}/regenerate-token/")
        self.assertEqual(res.status_code, 200)

    def test_assignments_crud(self):
        t = Team.objects.create(name="Dev", workspace=self.ws)
        sg = ServerGroup.objects.create(name="staging", workspace=self.ws)
        res = self.client.post(
            "/api/assignments/",
            {"team": t.id, "server_group": sg.id, "role": "sudo"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["role"], "sudo")

    def test_provision_returns_script(self):
        sg = ServerGroup.objects.create(name="prod", workspace=self.ws)
        t = Team.objects.create(name="Dev", workspace=self.ws)
        m = Member.objects.create(username="alice", workspace=self.ws)
        m.teams.add(t)
        SSHKey.objects.create(member=m, label="k", public_key="ssh-ed25519 AAA test")
        Assignment.objects.create(team=t, server_group=sg, role="user")

        anon = APIClient()
        res = anon.get(f"/api/provision/{sg.provision_token}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "text/x-shellscript")
        self.assertIn(b"ensure_user", res.content)

    def test_provision_invalid_token(self):
        anon = APIClient()
        res = anon.get(
            "/api/provision/00000000-0000-0000-0000-000000000000/"
        )
        self.assertEqual(res.status_code, 404)

    def test_heartbeat(self):
        sg = ServerGroup.objects.create(name="prod", workspace=self.ws)
        anon = APIClient()
        res = anon.post(
            f"/api/heartbeat/{sg.provision_token}/",
            {"hostname": "web-01"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Server.objects.filter(server_group=sg).count(), 1)
        server = Server.objects.get(server_group=sg)
        self.assertEqual(server.hostname, "web-01")
        self.assertIsNotNone(server.last_seen)

    def test_heartbeat_updates_existing(self):
        sg = ServerGroup.objects.create(name="prod", workspace=self.ws)
        anon = APIClient()
        anon.post(
            f"/api/heartbeat/{sg.provision_token}/",
            {"hostname": "web-01"},
            format="json",
        )
        anon.post(
            f"/api/heartbeat/{sg.provision_token}/",
            {"hostname": "web-01"},
            format="json",
        )
        self.assertEqual(Server.objects.filter(server_group=sg).count(), 1)

    def test_dashboard_stats(self):
        res = self.client.get("/api/stats/")
        self.assertEqual(res.status_code, 200)
        for key in ("projects", "members", "servers_online", "recent_activity"):
            self.assertIn(key, res.data)

    def test_health_check(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["api"])
        self.assertTrue(res.data["database"])
        self.assertIsInstance(res.data["uptime_seconds"], int)
        self.assertGreaterEqual(res.data["uptime_seconds"], 0)
        hf = res.data["heartbeat_freshness"]
        for key in ("total_servers", "online", "stale"):
            self.assertIn(key, hf)

    def test_health_requires_auth(self):
        anon = APIClient()
        res = anon.get("/api/health/")
        self.assertEqual(res.status_code, 401)

    def test_projects_crud(self):
        res = self.client.post(
            "/api/projects/", {"name": "Acme", "description": "Client"}, format="json"
        )
        self.assertEqual(res.status_code, 201)
        pid = res.data["id"]
        res = self.client.get("/api/projects/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

        res = self.client.delete(f"/api/projects/{pid}/")
        self.assertEqual(res.status_code, 204)

    def test_project_access_and_assign_team(self):
        proj = Project.objects.create(name="P1", workspace=self.ws)
        sg1 = ServerGroup.objects.create(project=proj, name="Development")
        sg2 = ServerGroup.objects.create(project=proj, name="Staging")
        team = Team.objects.create(name="DevOps", workspace=self.ws)
        res = self.client.get(f"/api/projects/{proj.id}/access/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["environments"]), 2)
        self.assertEqual(res.data["team_rows"], [])
        self.assertEqual(res.data["member_rows"], [])
        self.assertEqual(res.data["revoked_member_rows"], [])

        res = self.client.post(
            f"/api/projects/{proj.id}/assign-team/",
            {"team": team.id, "role": "sudo"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["updated"], 2)
        self.assertEqual(Assignment.objects.filter(team=team).count(), 2)

        res = self.client.get(f"/api/projects/{proj.id}/access/")
        self.assertEqual(len(res.data["team_rows"]), 1)
        self.assertEqual(res.data["team_rows"][0]["cells"][0]["role"], "sudo")

    def test_project_access_environment_order(self):
        """Environments appear as Development -> Staging -> Production."""
        proj = Project.objects.create(name="Ordered", workspace=self.ws)
        ServerGroup.objects.create(project=proj, name="Production")
        ServerGroup.objects.create(project=proj, name="Development")
        ServerGroup.objects.create(project=proj, name="Staging")
        res = self.client.get(f"/api/projects/{proj.id}/access/")
        self.assertEqual(res.status_code, 200)
        names = [e["name"] for e in res.data["environments"]]
        self.assertEqual(names, ["Development", "Staging", "Production"])

    def test_project_assign_member(self):
        proj = Project.objects.create(name="P2", workspace=self.ws)
        sg = ServerGroup.objects.create(project=proj, name="Dev")
        m = Member.objects.create(username="solo", workspace=self.ws)
        SSHKey.objects.create(member=m, label="k", public_key="ssh-ed25519 AAA test")
        res = self.client.post(
            f"/api/projects/{proj.id}/assign-member/",
            {"member": m.id, "role": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Assignment.objects.filter(member=m).count(), 1)
        res = self.client.get(f"/api/projects/{proj.id}/access/")
        self.assertEqual(len(res.data["member_rows"]), 1)
        self.assertEqual(res.data["member_rows"][0]["member"]["username"], "solo")
        self.assertEqual(res.data["revoked_member_rows"], [])

    def test_project_assign_member_rejects_revoked(self):
        proj = Project.objects.create(name="PR", workspace=self.ws)
        ServerGroup.objects.create(project=proj, name="E1")
        m = Member.objects.create(
            username="gone", access_revoked=True, workspace=self.ws
        )
        res = self.client.post(
            f"/api/projects/{proj.id}/assign-member/",
            {"member": m.id, "role": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_revoke_access_splits_project_matrix(self):
        proj = Project.objects.create(name="PR2", workspace=self.ws)
        sg = ServerGroup.objects.create(project=proj, name="Env")
        m = Member.objects.create(username="alice", workspace=self.ws)
        SSHKey.objects.create(member=m, label="k", public_key="ssh-ed25519 AAA test")
        self.client.post(
            f"/api/projects/{proj.id}/assign-member/",
            {"member": m.id, "role": "user"},
            format="json",
        )
        res = self.client.post(f"/api/members/{m.id}/revoke-access/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["access_revoked"])
        m.refresh_from_db()
        self.assertTrue(m.access_revoked)
        self.assertEqual(m.teams.count(), 0)
        res = self.client.get(f"/api/projects/{proj.id}/access/")
        self.assertEqual(len(res.data["member_rows"]), 0)
        self.assertEqual(len(res.data["revoked_member_rows"]), 1)
        self.assertEqual(res.data["revoked_member_rows"][0]["member"]["username"], "alice")
        self.assertEqual(res.data["revoked_member_rows"][0]["cells"][0]["role"], "removed")

    def test_provision_includes_direct_member_assignment(self):
        sg = ServerGroup.objects.create(name="solo-env", workspace=self.ws)
        m = Member.objects.create(username="direct", workspace=self.ws)
        SSHKey.objects.create(member=m, label="k", public_key="ssh-ed25519 AAAKEY test")
        Assignment.objects.create(member=m, server_group=sg, role="user")
        script = generate_provision_script(sg)
        self.assertIn("ensure_user direct user", script)

    def test_project_setup_environments(self):
        proj = Project.objects.create(name="New", workspace=self.ws)
        res = self.client.post(
            f"/api/projects/{proj.id}/setup-environments/",
            {"development": True, "staging": True, "production": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["created_ids"]), 2)
        names = set(proj.server_groups.values_list("name", flat=True))
        self.assertEqual(names, {"Development", "Staging"})

    def test_server_groups_filter_ungrouped(self):
        ServerGroup.objects.create(name="orphan", workspace=self.ws)
        proj = Project.objects.create(name="P", workspace=self.ws)
        ServerGroup.objects.create(project=proj, name="dev")
        res = self.client.get("/api/server-groups/?ungrouped=1")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "orphan")

    def test_other_workspace_not_visible(self):
        other = User.objects.create_user("other", "pw")
        Team.objects.create(name="Hidden", workspace=other.sanctum_workspace)
        res = self.client.get("/api/teams/")
        names = [row["name"] for row in res.data]
        self.assertNotIn("Hidden", names)

    def test_register_returns_token(self):
        anon = APIClient()
        res = anon.post(
            "/api/auth/register/",
            {
                "username": "signup1",
                "password": "ComplexPass123!",
                "email": "signup1@test.com",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["username"], "signup1")

    def test_unauthenticated_access_denied(self):
        anon = APIClient()
        res = anon.get("/api/teams/")
        self.assertEqual(res.status_code, 401)

    def test_workspace_summary(self):
        res = self.client.get("/api/workspace/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("environment_count", res.data)
        self.assertIn("environment_limit", res.data)
        self.assertIsNone(res.data["environment_limit"])
        self.assertEqual(res.data["deployment_mode"], "self_hosted")


@override_settings(SANCTUM_ENVIRONMENT_POLICY="core.tests_env_policy_stub")
class EnvironmentPolicyStubTests(TestCase):
    """Max 6 environments (stub policy) — exercises limited-environment behavior."""

    def setUp(self):
        self.user = User.objects.create_user("policyuser", "pw")
        self.ws = self.user.sanctum_workspace
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_seventh_ungrouped_server_group_rejected(self):
        for i in range(6):
            ServerGroup.objects.create(name=f"e{i}", workspace=self.ws)
        res = self.client.post(
            "/api/server-groups/", {"name": "seven"}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_setup_environments_respects_batch_limit(self):
        proj = Project.objects.create(name="Batch", workspace=self.ws)
        for i in range(5):
            ServerGroup.objects.create(name=f"x{i}", workspace=self.ws)
        res = self.client.post(
            f"/api/projects/{proj.id}/setup-environments/",
            {"development": True, "staging": True, "production": True},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_workspace_summary_shows_limit(self):
        res = self.client.get("/api/workspace/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["environment_limit"], 6)
