import shlex

from django.db.models import Q

from .models import Assignment


def _effective_role(prev_role, new_role):
    if prev_role is None:
        return new_role
    if "sudo" in (prev_role, new_role):
        return "sudo"
    if "user" in (prev_role, new_role):
        return "user"
    return "removed"


def generate_provision_script(server_group, request=None):
    """Generate an idempotent bash provisioning script for a server group."""

    assignments = (
        Assignment.objects.filter(server_group=server_group)
        .filter(Q(team__isnull=False) | Q(member__isnull=False))
        .select_related("team", "member")
        .prefetch_related("team__members__ssh_keys")
    )

    member_roles = {}

    for assignment in assignments:
        if assignment.team_id:
            for member in assignment.team.members.all():
                keys = list(member.ssh_keys.all())
                if member.id in member_roles:
                    prev_role = member_roles[member.id][1]
                    eff = _effective_role(prev_role, assignment.role)
                    member_roles[member.id] = (member, eff, keys)
                else:
                    member_roles[member.id] = (member, assignment.role, keys)
        else:
            member = assignment.member
            keys = list(member.ssh_keys.all())
            if member.id in member_roles:
                prev_role = member_roles[member.id][1]
                eff = _effective_role(prev_role, assignment.role)
                member_roles[member.id] = (member, eff, keys)
            else:
                member_roles[member.id] = (member, assignment.role, keys)

    base_url = ""
    if request:
        base_url = request.build_absolute_uri("/").rstrip("/")

    token = str(server_group.provision_token)

    lines = [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "",
        "# Sanctum Provisioning Script",
        f"# Server Group: {server_group.name}",
        "# This script is idempotent -- safe to run via cron.",
        "",
        'LOG="/var/log/sanctum.log"',
        'MARKER="# MANAGED BY SANCTUM"',
        "",
        'log() { echo "$(date -Is) SANCTUM: $*" >> "$LOG"; }',
        "",
        "ensure_user() {",
        '  local username="$1" role="$2"',
        "  shift 2",
        '  local keys=("$@")',
        "",
        '  if ! id "$username" &>/dev/null; then',
        '    useradd -m -s /bin/bash "$username"',
        '    log "CREATED user $username"',
        "  fi",
        "",
        "  local home",
        '  home=$(eval echo "~$username")',
        '  mkdir -p "$home/.ssh"',
        "",
        "  {",
        '    echo "$MARKER"',
        '    for key in "${keys[@]}"; do',
        '      echo "$key"',
        "    done",
        '  } > "$home/.ssh/authorized_keys"',
        "",
        '  chown -R "$username:$username" "$home/.ssh"',
        '  chmod 700 "$home/.ssh"',
        '  chmod 600 "$home/.ssh/authorized_keys"',
        "",
        '  if [ "$role" = "sudo" ]; then',
        '    if ! groups "$username" 2>/dev/null | grep -qw sudo; then',
        '      usermod -aG sudo "$username"',
        '      log "SUDO+ $username"',
        "    fi",
        "  else",
        '    if groups "$username" 2>/dev/null | grep -qw sudo; then',
        '      gpasswd -d "$username" sudo 2>/dev/null || true',
        '      log "SUDO- $username"',
        "    fi",
        "  fi",
        "",
        '  usermod -U "$username" 2>/dev/null || true',
        "}",
        "",
        "remove_user() {",
        '  local username="$1"',
        '  if id "$username" &>/dev/null; then',
        '    usermod -L "$username" 2>/dev/null || true',
        "    local home",
        '    home=$(eval echo "~$username")',
        '    rm -f "$home/.ssh/authorized_keys"',
        '    gpasswd -d "$username" sudo 2>/dev/null || true',
        '    log "LOCKED user $username, removed keys and sudo"',
        "  fi",
        "}",
        "",
        "# --- Desired State ---",
        "",
    ]

    for _mid, (member, role, keys) in sorted(
        member_roles.items(), key=lambda x: x[1][0].username
    ):
        if role in ("user", "sudo"):
            key_args = [
                shlex.quote(k.public_key.strip()) for k in keys if k.public_key.strip()
            ]
            if not key_args:
                lines.append(
                    f"# SKIPPED {member.username}: no SSH keys configured"
                )
                continue
            lines.append(
                f"ensure_user {shlex.quote(member.username)} {shlex.quote(role)} \\"
            )
            for i, ka in enumerate(key_args):
                suffix = " \\" if i < len(key_args) - 1 else ""
                lines.append(f"  {ka}{suffix}")
            lines.append("")
        elif role == "removed":
            lines.append(f"remove_user {shlex.quote(member.username)}")
            lines.append("")

    # Build the set of usernames this script is aware of so the cleanup
    # pass can recognise stale OS users left behind by earlier runs.
    known_usernames = sorted(
        {member.username for _mid, (member, _role, _keys) in member_roles.items()}
    )
    known_str = "|".join([""] + known_usernames + [""])  # e.g. "|alice|bob|"

    lines.extend([
        "# --- Cleanup: lock stale Sanctum-managed users no longer in desired state ---",
        f'KNOWN_USERS="{known_str}"',
        "",
        "for home_dir in /home/*/; do",
        '  [ -d "$home_dir" ] || continue',
        '  username=$(basename "$home_dir")',
        '  ak="$home_dir.ssh/authorized_keys"',
        '  [ -f "$ak" ] || continue',
        '  grep -q "$MARKER" "$ak" || continue',
        '  case "$KNOWN_USERS" in',
        '    *"|$username|"*) ;;',
        '    *) remove_user "$username" ;;',
        "  esac",
        "done",
        "",
    ])

    if base_url:
        lines.extend([
            "# --- Heartbeat ---",
            f"curl -sSL -X POST {shlex.quote(base_url + '/api/heartbeat/' + token + '/')} \\",
            '  -d "hostname=$(hostname)" &>/dev/null || true',
        ])

    lines.append("")
    return "\n".join(lines)
