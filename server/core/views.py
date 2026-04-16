import time
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.db.models import Count
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.conf import settings as django_settings
from django.utils import timezone
from rest_framework import viewsets, status, permissions, mixins
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .environment_policy import check_environment_creation, get_environment_limit
from .workspace import get_request_workspace
from .permissions import IsWorkspaceOwner

from .models import (
    Team,
    Member,
    SSHKey,
    Project,
    ServerGroup,
    Server,
    Assignment,
    WorkspaceAdmin,
)
from .serializers import (
    TeamSerializer,
    TeamDetailSerializer,
    TeamMinimalSerializer,
    MemberMinimalSerializer,
    MemberSerializer,
    SSHKeySerializer,
    SSHKeyUpdateSerializer,
    ProjectSerializer,
    ServerGroupSerializer,
    ServerSerializer,
    AssignmentSerializer,
    WorkspaceAdminSerializer,
    WorkspaceAdminCreateSerializer,
    WorkspaceAdminPatchSerializer,
)
from .provision import generate_provision_script
from .member_access import revoke_member_globally, restore_member_access

# Per Gunicorn worker process — used for dashboard uptime display.
_PROCESS_START = time.time()


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TeamDetailSerializer
        return TeamSerializer

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return Team.objects.none()
        qs = (
            Team.objects.filter(workspace=ws)
            .annotate(member_count=Count("members", distinct=True))
            .order_by("name")
        )
        if self.action in ("retrieve", "add_member", "remove_member"):
            qs = qs.prefetch_related("members")
        return qs

    def perform_create(self, serializer):
        ws = get_request_workspace(self.request)
        if ws is None:
            raise ValidationError("No workspace for this account.")
        serializer.save(workspace=ws)

    @action(detail=True, methods=["post"], url_path="members")
    def add_member(self, request, pk=None):
        """Add a user (member) to this team."""
        team = self.get_object()
        ws = get_request_workspace(request)
        member_id = request.data.get("member")
        if member_id is None:
            return Response(
                {"detail": "member is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        member = get_object_or_404(Member, pk=member_id, workspace=ws)
        if member.access_revoked:
            return Response(
                {
                    "detail": "This user’s access is globally revoked. Restore access before adding to teams."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        member.teams.add(team)
        team = self.get_queryset().get(pk=team.pk)
        serializer = TeamDetailSerializer(team, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"members/(?P<member_id>[^/.]+)",
    )
    def remove_member(self, request, pk=None, member_id=None):
        """Remove a user from this team."""
        team = self.get_object()
        ws = get_request_workspace(request)
        member = get_object_or_404(Member, pk=member_id, workspace=ws)
        member.teams.remove(team)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemberViewSet(viewsets.ModelViewSet):
    serializer_class = MemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return Member.objects.none()
        return (
            Member.objects.filter(workspace=ws)
            .prefetch_related("teams", "ssh_keys")
            .order_by("username")
        )

    def perform_create(self, serializer):
        ws = get_request_workspace(self.request)
        if ws is None:
            raise ValidationError("No workspace for this account.")
        serializer.save(workspace=ws)

    @action(detail=True, methods=["post"], url_path="keys")
    def add_key(self, request, pk=None):
        member = self.get_object()
        serializer = SSHKeySerializer(data={**request.data, "member": member.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"keys/(?P<key_id>[^/.]+)")
    def remove_key(self, request, pk=None, key_id=None):
        member = self.get_object()
        key = get_object_or_404(SSHKey, pk=key_id, member=member)
        key.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path=r"keys/(?P<key_id>[^/.]+)")
    def update_key(self, request, pk=None, key_id=None):
        member = self.get_object()
        key = get_object_or_404(SSHKey, pk=key_id, member=member)
        serializer = SSHKeyUpdateSerializer(
            key, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            SSHKeySerializer(key, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="generate-key")
    def generate_key(self, request, pk=None):
        member = self.get_object()
        label = request.data.get("label", "")

        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()

        public_ssh = public_key.public_bytes(
            serialization.Encoding.OpenSSH,
            serialization.PublicFormat.OpenSSH,
        ).decode()

        private_pem = private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.OpenSSH,
            serialization.NoEncryption(),
        ).decode()

        ssh_key = SSHKey.objects.create(
            member=member,
            label=label or "Generated key",
            public_key=public_ssh,
        )

        return Response({
            "id": ssh_key.id,
            "label": ssh_key.label,
            "public_key": public_ssh,
            "private_key": private_pem,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="revoke-access")
    def revoke_access(self, request, pk=None):
        """Globally revoke: remove from all teams; set removed on all reachable environments."""
        member = self.get_object()
        revoke_member_globally(member)
        member.refresh_from_db()
        serializer = MemberSerializer(member, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="restore-access")
    def restore_access(self, request, pk=None):
        """Clear global revocation and drop direct member assignments (fresh start)."""
        member = self.get_object()
        restore_member_access(member)
        member.refresh_from_db()
        serializer = MemberSerializer(member, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return Project.objects.none()
        return (
            Project.objects.filter(workspace=ws)
            .annotate(
                environment_count=Count("server_groups", distinct=True),
            )
            .order_by("name")
        )

    def perform_create(self, serializer):
        ws = get_request_workspace(self.request)
        if ws is None:
            raise ValidationError("No workspace for this account.")
        serializer.save(workspace=ws)

    @action(detail=True, methods=["get"], url_path="access")
    def access(self, request, pk=None):
        """Mini matrix: team rows and member (user) rows x environments."""
        project = self.get_object()
        ENV_ORDER = {"development": 0, "staging": 1, "production": 2}
        envs = sorted(
            project.server_groups.all(),
            key=lambda e: (ENV_ORDER.get(e.name.lower(), 99), e.name),
        )
        env_ids = [e.id for e in envs]
        if not env_ids:
            return Response(
                {
                    "environments": [],
                    "team_rows": [],
                    "member_rows": [],
                    "revoked_member_rows": [],
                }
            )

        assignments = Assignment.objects.filter(
            server_group_id__in=env_ids
        ).select_related("team", "member", "server_group")

        by_team = {}
        by_member = {}
        for a in assignments:
            if a.team_id:
                if a.team_id not in by_team:
                    by_team[a.team_id] = {}
                by_team[a.team_id][a.server_group_id] = {
                    "role": a.role,
                    "assignment_id": a.id,
                }
            elif a.member_id:
                if a.member_id not in by_member:
                    by_member[a.member_id] = {}
                by_member[a.member_id][a.server_group_id] = {
                    "role": a.role,
                    "assignment_id": a.id,
                }

        def cells_for(mapping, principal_id):
            out = []
            for eid in env_ids:
                cell = mapping.get(principal_id, {}).get(eid)
                if cell:
                    out.append(
                        {
                            "server_group_id": eid,
                            "role": cell["role"],
                            "assignment_id": cell["assignment_id"],
                        }
                    )
                else:
                    out.append(
                        {
                            "server_group_id": eid,
                            "role": None,
                            "assignment_id": None,
                        }
                    )
            return out

        wsp = project.workspace_id
        team_rows = []
        for t in Team.objects.filter(
            id__in=sorted(by_team.keys()), workspace_id=wsp
        ).order_by("name"):
            team_rows.append(
                {
                    "principal_type": "team",
                    "team": TeamMinimalSerializer(t).data,
                    "cells": cells_for(by_team, t.id),
                }
            )

        member_ids = sorted(by_member.keys())
        members_by_id = {
            m.id: m
            for m in Member.objects.filter(
                id__in=member_ids, workspace_id=wsp
            ).only("id", "username", "email", "access_revoked")
        }

        member_rows = []
        revoked_member_rows = []
        for mid in member_ids:
            m = members_by_id[mid]
            row = {
                "principal_type": "member",
                "member": MemberMinimalSerializer(m).data,
                "cells": cells_for(by_member, m.id),
            }
            if m.access_revoked:
                revoked_member_rows.append(row)
            else:
                member_rows.append(row)

        return Response(
            {
                "environments": [
                    {"id": e.id, "name": e.name, "provision_token": str(e.provision_token)}
                    for e in envs
                ],
                "team_rows": team_rows,
                "member_rows": member_rows,
                "revoked_member_rows": revoked_member_rows,
            }
        )

    @action(detail=True, methods=["post"], url_path="assign-team")
    def assign_team(self, request, pk=None):
        """Bulk-assign a team to all environments in this project with one role."""
        project = self.get_object()
        team_id = request.data.get("team")
        role = request.data.get("role", Assignment.ROLE_USER)
        if team_id is None:
            return Response(
                {"detail": "team is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        get_object_or_404(Team, pk=team_id, workspace_id=project.workspace_id)
        if role not in (
            Assignment.ROLE_USER,
            Assignment.ROLE_SUDO,
            Assignment.ROLE_REMOVED,
        ):
            return Response(
                {"detail": "invalid role"}, status=status.HTTP_400_BAD_REQUEST
            )
        sgs = list(project.server_groups.all())
        if not sgs:
            return Response(
                {"detail": "project has no environments"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        count = 0
        for sg in sgs:
            Assignment.objects.update_or_create(
                team_id=team_id,
                server_group=sg,
                defaults={"role": role, "member": None},
            )
            count += 1
        return Response({"updated": count})

    @action(detail=True, methods=["post"], url_path="assign-member")
    def assign_member(self, request, pk=None):
        """Bulk-assign a single user (Member) to all environments with one role."""
        project = self.get_object()
        member_id = request.data.get("member")
        role = request.data.get("role", Assignment.ROLE_USER)
        if member_id is None:
            return Response(
                {"detail": "member is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if role not in (
            Assignment.ROLE_USER,
            Assignment.ROLE_SUDO,
            Assignment.ROLE_REMOVED,
        ):
            return Response(
                {"detail": "invalid role"}, status=status.HTTP_400_BAD_REQUEST
            )
        member = get_object_or_404(
            Member, pk=member_id, workspace_id=project.workspace_id
        )
        if member.access_revoked:
            return Response(
                {
                    "detail": "This user’s access is globally revoked. Restore access before bulk-assigning."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        sgs = list(project.server_groups.all())
        if not sgs:
            return Response(
                {"detail": "project has no environments"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        count = 0
        for sg in sgs:
            Assignment.objects.update_or_create(
                member_id=member_id,
                server_group=sg,
                defaults={"role": role, "team": None},
            )
            count += 1
        return Response({"updated": count})

    @action(detail=True, methods=["post"], url_path="setup-environments")
    def setup_environments(self, request, pk=None):
        """Create preset server groups (Development, Staging, Production) if checked."""
        project = self.get_object()
        presets = [
            ("development", "Development"),
            ("staging", "Staging"),
            ("production", "Production"),
        ]
        ws = project.workspace
        new_count = 0
        for key, label in presets:
            if request.data.get(key):
                exists = ServerGroup.objects.filter(
                    project=project, name=label
                ).exists()
                if not exists:
                    new_count += 1
        check_environment_creation(ws, creating_count=new_count)

        created_ids = []
        for key, label in presets:
            if request.data.get(key):
                sg, _ = ServerGroup.objects.get_or_create(
                    project=project,
                    name=label,
                    defaults={"description": ""},
                )
                created_ids.append(sg.id)
        return Response({"created_ids": created_ids})


class ServerGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ServerGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return ServerGroup.objects.none()
        qs = (
            ServerGroup.objects.filter(workspace=ws)
            .annotate(
                server_count=Count("servers", distinct=True),
                assignment_count=Count("assignments", distinct=True),
            )
            .order_by("name")
        )
        project = self.request.query_params.get("project")
        ungrouped = self.request.query_params.get("ungrouped")
        if ungrouped in ("1", "true", "yes"):
            qs = qs.filter(project__isnull=True)
        elif project is not None and project != "":
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        ws = get_request_workspace(self.request)
        if ws is None:
            raise ValidationError("No workspace for this account.")
        check_environment_creation(ws, creating_count=1)
        project = serializer.validated_data.get("project")
        if project is not None:
            if project.workspace_id != ws.id:
                raise ValidationError({"project": "Invalid project for this workspace."})
            serializer.save(workspace_id=project.workspace_id)
        else:
            serializer.save(workspace=ws)

    @action(detail=True, methods=["post"], url_path="regenerate-token")
    def regenerate_token(self, request, pk=None):
        server_group = self.get_object()
        server_group.regenerate_token()
        return Response({"provision_token": str(server_group.provision_token)})


class ServerViewSet(viewsets.ModelViewSet):
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return Server.objects.none()
        qs = (
            Server.objects.filter(server_group__workspace=ws)
            .select_related("server_group")
            .order_by("-last_seen", "name")
        )
        group_id = self.request.query_params.get("server_group")
        if group_id:
            qs = qs.filter(server_group_id=group_id)
        return qs


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return Assignment.objects.none()
        return (
            Assignment.objects.filter(server_group__workspace=ws)
            .select_related("team", "member", "server_group")
            .order_by("server_group_id", "team_id", "member_id")
        )

    def perform_create(self, serializer):
        ws = get_request_workspace(self.request)
        if ws is None:
            raise ValidationError("No workspace for this account.")
        sg = serializer.validated_data.get("server_group")
        if sg and sg.workspace_id != ws.id:
            raise ValidationError({"server_group": "Invalid environment."})
        team = serializer.validated_data.get("team")
        member = serializer.validated_data.get("member")
        if team is not None and team.workspace_id != ws.id:
            raise ValidationError({"team": "Invalid team."})
        if member is not None and member.workspace_id != ws.id:
            raise ValidationError({"member": "Invalid member."})
        serializer.save()


class WorkspaceAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Owner-only: create Django users who manage the workspace (not billing)."""

    permission_classes = [IsWorkspaceOwner]

    def get_queryset(self):
        ws = get_request_workspace(self.request)
        if ws is None:
            return WorkspaceAdmin.objects.none()
        return (
            WorkspaceAdmin.objects.filter(workspace=ws)
            .select_related("user")
            .order_by("user__username")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return WorkspaceAdminCreateSerializer
        if self.action in ("partial_update", "update"):
            return WorkspaceAdminPatchSerializer
        return WorkspaceAdminSerializer

    def partial_update(self, request, *args, **kwargs):
        admin = self.get_object()
        serializer = WorkspaceAdminPatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "email" in serializer.validated_data:
            admin.user.email = serializer.validated_data.get("email") or ""
            admin.user.save(update_fields=["email"])
        return Response(
            WorkspaceAdminSerializer(admin, context={"request": request}).data
        )

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = WorkspaceAdminCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ws = get_request_workspace(request)
        if ws is None:
            raise ValidationError("No workspace for this account.")
        username = (serializer.validated_data.get("username") or "").strip()
        password = serializer.validated_data["password"]
        email = (serializer.validated_data.get("email") or "").strip()

        User = get_user_model()
        if not username:
            raise ValidationError({"username": "Username is required."})
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError(
                {"username": "A user with that username already exists."}
            )
        if ws.owner.username.lower() == username.lower():
            raise ValidationError(
                {"username": "That username is the workspace owner."}
            )
        try:
            validate_password(password)
        except DjangoValidationError as e:
            raise ValidationError({"password": list(e.messages)})

        user = User(username=username, email=email or "")
        user.set_password(password)
        user._skip_workspace_creation = True
        user.save()

        wa = WorkspaceAdmin.objects.create(workspace=ws, user=user)
        out = WorkspaceAdminSerializer(wa, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.user.delete()

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        admin = self.get_object()
        new_password = request.data.get("new_password") or ""
        if not new_password:
            return Response(
                {"detail": "new_password is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user=admin.user)
        except DjangoValidationError as e:
            return Response(
                {"detail": " ".join(e.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        admin.user.set_password(new_password)
        admin.user.save()
        from rest_framework.authtoken.models import Token

        Token.objects.filter(user=admin.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def provision_view(request, token):
    server_group = get_object_or_404(ServerGroup, provision_token=token)
    script = generate_provision_script(server_group, request)
    return HttpResponse(script, content_type="text/x-shellscript")


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def heartbeat_view(request, token):
    server_group = get_object_or_404(ServerGroup, provision_token=token)
    hostname = request.data.get("hostname", "")
    ip_address = request.META.get("REMOTE_ADDR", "")

    server, _created = Server.objects.update_or_create(
        server_group=server_group,
        hostname=hostname,
        defaults={
            "name": hostname or f"server-{uuid.uuid4().hex[:8]}",
            "last_seen": timezone.now(),
            "ip_address": ip_address if ip_address else None,
        },
    )
    return Response({"status": "ok", "server_id": server.id})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    ws = get_request_workspace(request)
    if ws is None:
        return Response(
            {
                "projects": 0,
                "members": 0,
                "servers_online": 0,
                "recent_activity": [],
            }
        )
    threshold = timezone.now() - timedelta(minutes=10)
    servers_online = (
        Server.objects.filter(
            server_group__workspace=ws, last_seen__gte=threshold
        ).count()
    )
    recent = (
        Server.objects.select_related("server_group")
        .filter(server_group__workspace=ws, last_seen__isnull=False)
        .order_by("-last_seen")[:5]
    )
    recent_activity = [
        {
            "id": s.id,
            "hostname": s.hostname or s.name,
            "server_group_name": s.server_group.name,
            "last_seen": s.last_seen.isoformat() if s.last_seen else None,
        }
        for s in recent
    ]
    return Response({
        "projects": Project.objects.filter(workspace=ws).count(),
        "members": Member.objects.filter(workspace=ws).count(),
        "servers_online": servers_online,
        "recent_activity": recent_activity,
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def workspace_summary(request):
    """Environment usage and optional limit (from pluggable policy)."""
    ws = get_request_workspace(request)
    if ws is None:
        return Response(
            {"detail": "No workspace for this account."},
            status=status.HTTP_404_NOT_FOUND,
        )
    env_count = ServerGroup.objects.filter(workspace=ws).count()
    limit = get_environment_limit(ws)
    role = "owner" if ws.owner_id == request.user.id else "admin"
    return Response({
        "id": ws.id,
        "name": ws.name,
        "environment_count": env_count,
        "environment_limit": limit,
        "deployment_mode": getattr(
            django_settings, "SANCTUM_DEPLOYMENT_MODE", "self_hosted"
        ),
        "role": role,
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def health_check(request):
    """Lightweight service status for the dashboard (per authenticated workspace)."""
    from django.db import connection

    database_ok = True
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        database_ok = False

    uptime_seconds = int(time.time() - _PROCESS_START)
    ws = get_request_workspace(request)
    threshold = timezone.now() - timedelta(minutes=10)

    if ws is None:
        return Response({
            "api": True,
            "database": database_ok,
            "uptime_seconds": uptime_seconds,
            "heartbeat_freshness": {
                "total_servers": 0,
                "online": 0,
                "stale": 0,
            },
        })

    total_servers = Server.objects.filter(server_group__workspace=ws).count()
    online = Server.objects.filter(
        server_group__workspace=ws, last_seen__gte=threshold
    ).count()
    stale = total_servers - online

    return Response({
        "api": True,
        "database": database_ok,
        "uptime_seconds": uptime_seconds,
        "heartbeat_freshness": {
            "total_servers": total_servers,
            "online": online,
            "stale": stale,
        },
    })
