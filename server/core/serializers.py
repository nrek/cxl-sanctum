from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import (
    Team,
    Member,
    SSHKey,
    Project,
    ServerGroup,
    Server,
    ServerHeartbeatLog,
    Assignment,
    WorkspaceAdmin,
)
from .workspace import get_request_workspace


class MemberMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = ["id", "username", "email", "access_revoked"]


class ProjectSerializer(serializers.ModelSerializer):
    environment_count = serializers.IntegerField(read_only=True, required=False)
    access_row_count = serializers.SerializerMethodField()
    environment_worst_status = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "environment_count",
            "access_row_count",
            "environment_worst_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def _now(self):
        return self.context.get("_now") or timezone.now()

    def get_environment_worst_status(self, obj):
        return project_environment_worst_status(obj, now=self._now())

    def get_access_row_count(self, obj):
        from django.db.models import Q

        sg_ids = obj.server_groups.values_list("id", flat=True)
        if not sg_ids:
            return 0
        qs = Assignment.objects.filter(server_group_id__in=sg_ids)
        team_rows = (
            qs.filter(team__isnull=False).values_list("team_id", flat=True).distinct().count()
        )
        member_rows = (
            qs.filter(member__isnull=False)
            .values_list("member_id", flat=True)
            .distinct()
            .count()
        )
        return team_rows + member_rows


class SSHKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = SSHKey
        fields = ["id", "member", "label", "public_key", "created_at"]
        read_only_fields = ["id", "created_at"]


class SSHKeyUpdateSerializer(serializers.ModelSerializer):
    """PATCH label and/or public_key on an existing key."""

    class Meta:
        model = SSHKey
        fields = ["label", "public_key"]

    def validate_public_key(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Public key cannot be empty.")
        if len(value) < 20:
            raise serializers.ValidationError("Public key looks too short.")
        if not (
            value.startswith("ssh-")
            or value.startswith("ecdsa-sha2-")
            or value.startswith("sk-")
        ):
            raise serializers.ValidationError(
                "Public key must look like an OpenSSH line (e.g. ssh-ed25519 …)."
            )
        return value

    def validate_label(self, value):
        if value is None:
            return ""
        return (value or "").strip()[:100]


class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Team
        fields = ["id", "name", "description", "member_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeamDetailSerializer(TeamSerializer):
    """GET /teams/:id/ — includes members for roster management."""

    members = MemberMinimalSerializer(many=True, read_only=True)

    class Meta(TeamSerializer.Meta):
        fields = TeamSerializer.Meta.fields + ["members"]


class TeamMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name"]


class MemberSerializer(serializers.ModelSerializer):
    ssh_keys = SSHKeySerializer(many=True, read_only=True)
    teams = TeamMinimalSerializer(many=True, read_only=True)
    team_ids = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.none(), many=True, write_only=True, required=False
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            ws = get_request_workspace(request)
            if ws is not None:
                qs = Team.objects.filter(workspace=ws)
                field = self.fields["team_ids"]
                if getattr(field, "child_relation", None) is not None:
                    field.child_relation.queryset = qs
                else:
                    field.queryset = qs

    class Meta:
        model = Member
        fields = [
            "id",
            "username",
            "email",
            "access_revoked",
            "teams",
            "team_ids",
            "ssh_keys",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "access_revoked", "created_at", "updated_at"]

    def create(self, validated_data):
        team_objs = validated_data.pop("team_ids", [])
        member = Member.objects.create(**validated_data)
        if team_objs:
            member.teams.set(team_objs)
        return member

    def update(self, instance, validated_data):
        team_objs = validated_data.pop("team_ids", None)
        if (
            instance.access_revoked
            and team_objs is not None
            and len(team_objs) > 0
        ):
            raise serializers.ValidationError(
                {
                    "team_ids": "This user’s access is globally revoked. Restore access before adding teams."
                }
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if team_objs is not None:
            instance.teams.set(team_objs)
        return instance


class ServerGroupSerializer(serializers.ModelSerializer):
    server_count = serializers.IntegerField(read_only=True, required=False)
    assignment_count = serializers.IntegerField(read_only=True, required=False)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = ServerGroup
        fields = [
            "id",
            "project",
            "project_name",
            "name",
            "description",
            "provision_token",
            "server_count",
            "assignment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "provision_token", "created_at", "updated_at"]


SERVER_ONLINE_WITHIN_SEC = 10 * 60
SERVER_STALE_WITHIN_SEC = 24 * 60 * 60

HEARTBEAT_RHYTHM_BUCKETS = 12
HEARTBEAT_RHYTHM_BUCKET_MINUTES = 5
HEARTBEAT_RHYTHM_WINDOW_MINUTES = HEARTBEAT_RHYTHM_BUCKETS * HEARTBEAT_RHYTHM_BUCKET_MINUTES


def compute_heartbeat_rhythm_status(received, expected, last_seen, now):
    """Dashboard rhythm label: stable / warning / degrading / offline / unknown.

    Aligns last-seen offline threshold with SERVER_ONLINE_WITHIN_SEC (10 minutes).
    """
    if expected <= 0:
        return "unknown"
    if last_seen is None:
        return "offline"
    age_min = (now - last_seen).total_seconds() / 60.0
    if age_min >= SERVER_ONLINE_WITHIN_SEC / 60.0:
        return "offline"
    success_rate = received / expected
    if success_rate >= 0.95:
        return "stable"
    if success_rate >= 0.75:
        return "warning"
    if success_rate >= 0.50:
        return "degrading"
    return "offline"


def build_heartbeat_rhythm_by_server_id(server_ids, now, last_seen_by_id):
    """12 buckets of 5 minutes each, oldest → newest (left → right in UI)."""
    if not server_ids:
        return {}
    id_set = frozenset(server_ids)
    window_start = []
    window_end = []
    for k in range(HEARTBEAT_RHYTHM_BUCKETS):
        ws = now - timedelta(minutes=HEARTBEAT_RHYTHM_WINDOW_MINUTES - HEARTBEAT_RHYTHM_BUCKET_MINUTES * k)
        we = (
            now - timedelta(minutes=HEARTBEAT_RHYTHM_WINDOW_MINUTES - HEARTBEAT_RHYTHM_BUCKET_MINUTES * (k + 1))
            if k < HEARTBEAT_RHYTHM_BUCKETS - 1
            else now
        )
        window_start.append(ws)
        window_end.append(we)

    windows_by = {sid: [False] * HEARTBEAT_RHYTHM_BUCKETS for sid in server_ids}

    logs = ServerHeartbeatLog.objects.filter(
        server_id__in=server_ids,
        recorded_at__gte=now - timedelta(minutes=HEARTBEAT_RHYTHM_WINDOW_MINUTES),
    ).values_list("server_id", "recorded_at")

    for sid, t in logs:
        if sid not in id_set:
            continue
        for k in range(HEARTBEAT_RHYTHM_BUCKETS):
            if window_start[k] <= t < window_end[k]:
                windows_by[sid][k] = True
                break

    for sid in server_ids:
        ls = last_seen_by_id.get(sid)
        if ls is None:
            continue
        for k in range(HEARTBEAT_RHYTHM_BUCKETS):
            if window_start[k] <= ls < window_end[k]:
                windows_by[sid][k] = True
                break

    out = {}
    for sid in server_ids:
        w = windows_by[sid]
        received = sum(1 for x in w if x)
        expected = HEARTBEAT_RHYTHM_BUCKETS
        missed = expected - received
        ls = last_seen_by_id.get(sid)
        status = compute_heartbeat_rhythm_status(received, expected, ls, now)
        out[sid] = {
            "heartbeat_windows": w,
            "heartbeat_expected": expected,
            "heartbeat_received": received,
            "heartbeat_missed": missed,
            "heartbeat_rhythm_status": status,
            "heartbeat_window_minutes": HEARTBEAT_RHYTHM_WINDOW_MINUTES,
            "heartbeat_interval_minutes": HEARTBEAT_RHYTHM_BUCKET_MINUTES,
        }
    return out


def server_status_for(last_seen, *, now=None):
    """Bucket a server by freshness: online / stale / dead.

    - online: seen within the last 10 minutes (cron runs every 5, so 2 misses = stale)
    - stale:  seen within the last 24 hours, but not in the last 10 minutes
    - dead:   never seen, or last seen over 24 hours ago
    """
    if last_seen is None:
        return "dead"
    now = now or timezone.now()
    age = (now - last_seen).total_seconds()
    if age <= SERVER_ONLINE_WITHIN_SEC:
        return "online"
    if age <= SERVER_STALE_WITHIN_SEC:
        return "stale"
    return "dead"


def environment_heartbeat_worst(servers, *, now=None):
    """Worst heartbeat bucket for one environment (iterable of Server).

    Returns:
        "dead" | "stale" | "live" — or None if there are no server rows yet.
    """
    now = now or timezone.now()
    servers = list(servers)
    if not servers:
        return None
    has_stale = False
    for srv in servers:
        st = server_status_for(srv.last_seen, now=now)
        if st == "dead":
            return "dead"
        if st == "stale":
            has_stale = True
    return "stale" if has_stale else "live"


def project_environment_worst_status(project, *, now=None):
    """Aggregate worst status across environments (server groups) in a project.

    Environments with no servers are ignored. All-empty project -> "live".
    Priority: any dead > any stale > all live.
    """
    now = now or timezone.now()
    worst = "live"
    rank = {"live": 0, "stale": 1, "dead": 2}
    for sg in project.server_groups.all():
        w = environment_heartbeat_worst(sg.servers.all(), now=now)
        if w is None:
            continue
        if rank[w] > rank[worst]:
            worst = w
        if worst == "dead":
            break
    return worst


class ServerSerializer(serializers.ModelSerializer):
    server_group_name = serializers.CharField(source="server_group.name", read_only=True)
    project_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    seconds_since_seen = serializers.SerializerMethodField()
    likely_replaced_by = serializers.SerializerMethodField()
    heartbeat_windows = serializers.SerializerMethodField()
    heartbeat_expected = serializers.SerializerMethodField()
    heartbeat_received = serializers.SerializerMethodField()
    heartbeat_missed = serializers.SerializerMethodField()
    heartbeat_rhythm_status = serializers.SerializerMethodField()
    heartbeat_window_minutes = serializers.SerializerMethodField()
    heartbeat_interval_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Server
        fields = [
            "id", "name", "hostname",
            "server_group", "server_group_name", "project_name",
            "ip_address", "last_seen", "created_at",
            "status", "seconds_since_seen", "likely_replaced_by",
            "heartbeat_windows",
            "heartbeat_expected",
            "heartbeat_received",
            "heartbeat_missed",
            "heartbeat_rhythm_status",
            "heartbeat_window_minutes",
            "heartbeat_interval_minutes",
        ]
        read_only_fields = [
            "id", "last_seen", "created_at",
            "project_name",
            "status", "seconds_since_seen", "likely_replaced_by",
            "heartbeat_windows",
            "heartbeat_expected",
            "heartbeat_received",
            "heartbeat_missed",
            "heartbeat_rhythm_status",
            "heartbeat_window_minutes",
            "heartbeat_interval_minutes",
        ]

    def _now(self):
        cached = self.context.get("_now") if hasattr(self, "context") else None
        return cached or timezone.now()

    def get_project_name(self, obj):
        project = getattr(obj.server_group, "project", None)
        return project.name if project else None

    def get_seconds_since_seen(self, obj):
        if obj.last_seen is None:
            return None
        return int((self._now() - obj.last_seen).total_seconds())

    def get_status(self, obj):
        return server_status_for(obj.last_seen, now=self._now())

    def _heartbeat_rhythm_payload(self, obj):
        cache = self.context.setdefault("_heartbeat_rhythm_cache", {})
        if obj.id in cache:
            return cache[obj.id]
        m = self.context.get("heartbeat_rhythm_by_server_id")
        if m is not None and obj.id in m:
            cache[obj.id] = m[obj.id]
        else:
            cache[obj.id] = build_heartbeat_rhythm_by_server_id(
                [obj.id], self._now(), {obj.id: obj.last_seen}
            )[obj.id]
        return cache[obj.id]

    def get_heartbeat_windows(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_windows"]

    def get_heartbeat_expected(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_expected"]

    def get_heartbeat_received(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_received"]

    def get_heartbeat_missed(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_missed"]

    def get_heartbeat_rhythm_status(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_rhythm_status"]

    def get_heartbeat_window_minutes(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_window_minutes"]

    def get_heartbeat_interval_minutes(self, obj):
        return self._heartbeat_rhythm_payload(obj)["heartbeat_interval_minutes"]

    def get_likely_replaced_by(self, obj):
        # Only hint when the row itself isn't fresh — an online row is not a ghost.
        if self.get_status(obj) == "online":
            return None
        if not obj.ip_address:
            return None
        threshold = self._now() - timedelta(seconds=SERVER_ONLINE_WITHIN_SEC)
        candidate = (
            Server.objects
            .filter(
                server_group_id=obj.server_group_id,
                ip_address=obj.ip_address,
                last_seen__gte=threshold,
            )
            .exclude(pk=obj.pk)
            .order_by("-last_seen")
            .first()
        )
        if candidate is None:
            return None
        return {
            "id": candidate.id,
            "hostname": candidate.hostname or candidate.name,
        }


class AssignmentSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(read_only=True, allow_null=True)
    member_username = serializers.CharField(read_only=True, allow_null=True)
    server_group_name = serializers.CharField(source="server_group.name", read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            ws = get_request_workspace(request)
            if ws is not None:
                self.fields["team"].queryset = Team.objects.filter(workspace=ws)
                self.fields["member"].queryset = Member.objects.filter(workspace=ws)
                self.fields["server_group"].queryset = ServerGroup.objects.filter(
                    workspace=ws
                )

    class Meta:
        model = Assignment
        fields = [
            "id",
            "team",
            "member",
            "server_group",
            "team_name",
            "member_username",
            "server_group_name",
            "role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["team_name"] = instance.team.name if instance.team_id else None
        data["member_username"] = (
            instance.member.username if instance.member_id else None
        )
        return data

    def validate(self, attrs):
        inst = self.instance
        if inst is None:
            team = attrs.get("team")
            member = attrs.get("member")
        else:
            team = attrs.get("team", inst.team)
            member = attrs.get("member", inst.member)
        has_team = team is not None
        has_member = member is not None
        if has_team == has_member:
            raise serializers.ValidationError(
                "Set exactly one of team (group) or member (user)."
            )
        role = attrs.get("role")
        if role is None and inst is not None:
            role = inst.role
        if role is None:
            role = Assignment.ROLE_USER
        if (
            member is not None
            and getattr(member, "access_revoked", False)
            and role != Assignment.ROLE_REMOVED
        ):
            raise serializers.ValidationError(
                "This user’s access is globally revoked. Restore access on the Members page before granting user or sudo."
            )
        return attrs


class WorkspaceAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = WorkspaceAdmin
        fields = ["id", "user_id", "username", "email", "created_at"]


class WorkspaceAdminCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=1)
    email = serializers.EmailField(required=False, allow_blank=True, default="")


class WorkspaceAdminPatchSerializer(serializers.Serializer):
    """Update workspace admin contact email (stored on Django User)."""

    email = serializers.EmailField(required=False, allow_blank=True)
