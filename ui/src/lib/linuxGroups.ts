/** Client-side mirror of server/core/linux_groups.py validation (UI hints only). */

const LINUX_GROUP_NAME_RE = /^[a-z_][a-z0-9_-]{0,63}$/;

const BLOCKED = new Set([
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
]);

const BLOCKED_MESSAGES: Record<string, string> = {
  sudo:
    "The sudo group is controlled by Sanctum roles and cannot be assigned as a supplemental group.",
  docker:
    "The docker group can grant root-equivalent host access and is blocked by default.",
  wheel:
    "The wheel group can grant privilege escalation and is blocked by default.",
};

export const BLOCKED_SUPPLEMENTAL_GROUP_HINTS = "sudo, docker, wheel";

export function validateSupplementalGroupName(name: string): {
  ok: boolean;
  message: string;
} {
  const normalized = name.trim();
  if (!normalized) {
    return { ok: false, message: "Group name cannot be empty." };
  }
  if (!LINUX_GROUP_NAME_RE.test(normalized)) {
    return {
      ok: false,
      message: "Group names must match: ^[a-z_][a-z0-9_-]{0,63}$",
    };
  }
  const key = normalized.toLowerCase();
  if (BLOCKED.has(key)) {
    return {
      ok: false,
      message:
        BLOCKED_MESSAGES[key] ??
        `The ${key} group is blocked from supplemental assignment.`,
    };
  }
  return { ok: true, message: "" };
}
