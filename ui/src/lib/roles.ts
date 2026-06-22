import type { WorkspaceSummary } from "@/lib/api";

export type DashboardRole = "owner" | "admin" | "member";

export function workspaceRole(workspace?: WorkspaceSummary | null): DashboardRole {
  return workspace?.role ?? "member";
}

export function isAdminRole(workspace?: WorkspaceSummary | null): boolean {
  const role = workspaceRole(workspace);
  return role === "owner" || role === "admin";
}

export function isOwnerRole(workspace?: WorkspaceSummary | null): boolean {
  return workspaceRole(workspace) === "owner";
}

export function canViewBilling(workspace?: WorkspaceSummary | null): boolean {
  return Boolean(workspace?.can_view_billing);
}

export function canManageBilling(workspace?: WorkspaceSummary | null): boolean {
  return Boolean(workspace?.can_manage_billing);
}
