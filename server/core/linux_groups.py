"""Validation for customer-defined supplemental Linux groups on ServerGroups."""

from __future__ import annotations

import re

LINUX_GROUP_NAME_RE = re.compile(r"^[a-z_][a-z0-9_-]{0,63}$")

BLOCKED_SUPPLEMENTAL_GROUPS = frozenset(
    {
        "root",
        "sudo",
        "wheel",
        "adm",
        "admin",
        "shadow",
        "systemd-journal",
        "docker",
        "lxd",
        "disk",
        "kmem",
        "tty",
        "utmp",
        "staff",
    }
)

BLOCKED_GROUP_MESSAGES: dict[str, str] = {
    "sudo": (
        "The sudo group is controlled by Sanctum roles and cannot be assigned "
        "as a supplemental group."
    ),
    "wheel": (
        "The wheel group can grant privilege escalation and is blocked by default."
    ),
    "docker": (
        "The docker group can grant root-equivalent host access and is blocked "
        "by default."
    ),
    "lxd": (
        "The lxd group can grant root-equivalent host access and is blocked "
        "by default."
    ),
    "root": "The root group is blocked from supplemental assignment.",
    "shadow": "The shadow group is blocked from supplemental assignment.",
    "disk": "The disk group is blocked from supplemental assignment.",
    "kmem": "The kmem group is blocked from supplemental assignment.",
    "adm": "The adm group is blocked from supplemental assignment.",
    "admin": "The admin group is blocked from supplemental assignment.",
    "systemd-journal": (
        "The systemd-journal group is blocked from supplemental assignment."
    ),
    "tty": "The tty group is blocked from supplemental assignment.",
    "utmp": "The utmp group is blocked from supplemental assignment.",
    "staff": "The staff group is blocked from supplemental assignment.",
}


def normalize_group_name(name: str) -> str:
    return (name or "").strip()


def is_blocked_supplemental_group(name: str) -> bool:
    return normalize_group_name(name).lower() in BLOCKED_SUPPLEMENTAL_GROUPS


def blocked_group_message(name: str) -> str:
    key = normalize_group_name(name).lower()
    return BLOCKED_GROUP_MESSAGES.get(
        key,
        f"The {key} group is blocked from supplemental assignment.",
    )


def validate_linux_group_name(name: str) -> None:
    normalized = normalize_group_name(name)
    if not normalized:
        raise ValueError("Group name cannot be empty.")
    if not LINUX_GROUP_NAME_RE.match(normalized):
        raise ValueError("Group names must match: ^[a-z_][a-z0-9_-]{0,63}$")
    if is_blocked_supplemental_group(normalized):
        raise ValueError(blocked_group_message(normalized))


def validate_supplemental_groups(groups) -> list[str]:
    """Return deduplicated, validated group names preserving first-seen order."""
    if groups is None:
        return []
    if not isinstance(groups, list):
        raise ValueError("supplemental_groups must be a list of group names.")

    errors: dict[str, str] = {}
    result: list[str] = []
    seen: set[str] = set()

    for item in groups:
        raw = str(item)
        try:
            normalized = normalize_group_name(raw)
            validate_linux_group_name(normalized)
        except ValueError as exc:
            errors[raw] = str(exc)
            continue
        if normalized not in seen:
            seen.add(normalized)
            result.append(normalized)

    if errors:
        raise ValueError(errors)

    return result
