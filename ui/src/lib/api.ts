/** API root ending in `/api`. If unset: local dev uses :8000; deployed HTTPS uses same origin + `/api` (Apache proxies `/api`). */
export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLoopback =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";
    if (isLoopback) {
      return "http://localhost:8000/api";
    }
    return `${origin}/api`;
  }
  return "http://localhost:8000/api";
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("sanctum_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sanctum_token");
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || `API error ${res.status}`, res.status);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export async function login(
  username: string,
  password: string
): Promise<string> {
  const res = await fetch(`${getApiBase()}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = "Invalid username or password";
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      msg = `Sign-in request failed (${res.status}). Check NEXT_PUBLIC_API_URL (must be …/api) and that the API is up.`;
    } else if (res.status >= 500) {
      msg = `Server error (${res.status}). Try again or check API logs.`;
    } else if (body) {
      try {
        const j = JSON.parse(body) as { non_field_errors?: string[]; detail?: string };
        const bit =
          j.non_field_errors?.[0] ||
          (typeof j.detail === "string" ? j.detail : null);
        if (bit) msg = bit;
      } catch {
        if (body.length < 300) msg = body;
      }
    }
    throw new ApiError(msg, res.status);
  }
  const data = await res.json();
  localStorage.setItem("sanctum_token", data.token);
  return data.token;
}

export async function registerAccount(
  username: string,
  password: string,
  email?: string
): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      email: email ?? "",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    const msg = Array.isArray(d)
      ? d.join(" ")
      : typeof d === "string"
        ? d
        : `Registration failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  localStorage.setItem("sanctum_token", data.token);
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/auth/password-reset/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    const msg =
      typeof d === "string" ? d : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return typeof data.detail === "string"
    ? data.detail
    : "If an account exists for that email, instructions were sent.";
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/password-reset/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid,
      token,
      new_password: newPassword,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    const msg =
      typeof d === "string" ? d : `Reset failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
}

async function logoutRemote(): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("sanctum_token") : null;
  if (!token) return;
  await fetch(`${getApiBase()}/auth/logout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
  });
}

export function logout() {
  void logoutRemote()
    .catch(() => {})
    .finally(() => {
      localStorage.removeItem("sanctum_token");
      window.location.href = "/login";
    });
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("sanctum_token");
}

/** GET /workspace/ — environment usage and optional limit. */
export interface WorkspaceSummary {
  id: number;
  name: string;
  environment_count: number;
  environment_limit: number | null;
  deployment_mode: string;
  role: "owner" | "admin" | "member";
  member_id: number | null;
  can_view_billing: boolean;
  can_manage_billing: boolean;
  pending_access_requests: number;
}

export async function fetchWorkspaceSummary(): Promise<WorkspaceSummary> {
  return apiFetch<WorkspaceSummary>("/workspace/");
}

/** GET /workspace-admins/ — owner only. */
export interface WorkspaceAdminEntry {
  id: number;
  user_id: number;
  username: string;
  email: string;
  created_at: string;
}

export async function fetchWorkspaceAdmins(): Promise<WorkspaceAdminEntry[]> {
  return apiFetch<WorkspaceAdminEntry[]>("/workspace-admins/");
}

export async function createWorkspaceAdmin(payload: {
  username: string;
  password: string;
  email?: string;
}): Promise<WorkspaceAdminEntry> {
  return apiFetch<WorkspaceAdminEntry>("/workspace-admins/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkspaceAdmin(id: number): Promise<void> {
  await apiFetch(`/workspace-admins/${id}/`, { method: "DELETE" });
}

export async function resetWorkspaceAdminPassword(
  id: number,
  newPassword: string
): Promise<void> {
  await apiFetch(`/workspace-admins/${id}/reset-password/`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

/** PATCH email for a workspace admin (owner only). */
export async function patchWorkspaceAdmin(
  id: number,
  payload: { email?: string }
): Promise<WorkspaceAdminEntry> {
  return apiFetch<WorkspaceAdminEntry>(`/workspace-admins/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /billing/status/ — returns null if the API does not expose billing routes. */
export interface BillingStatus {
  workspace_id: number;
  plan: "free" | "pro";
  subscription_status: string;
  environment_count: number;
  environment_limit: number | null;
  has_stripe_customer: boolean;
}

export async function fetchBillingStatus(): Promise<BillingStatus | null> {
  try {
    return await apiFetch<BillingStatus>("/billing/status/");
  } catch {
    return null;
  }
}

/** POST /billing/checkout/ — Stripe Checkout URL when billing is enabled on the API. */
export async function startProCheckout(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/billing/checkout/", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data.url;
}

/** POST /billing/portal/ — Stripe Customer Portal URL when billing is enabled on the API. */
export async function openBillingPortal(returnUrl?: string): Promise<string> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const data = await apiFetch<{ url: string }>("/billing/portal/", {
    method: "POST",
    body: JSON.stringify({
      return_url: returnUrl ?? `${origin}/dashboard`,
    }),
  });
  return data.url;
}

// ---- Typed helpers ----

export interface MemberMinimal {
  id: number;
  username: string;
  email: string;
  access_revoked?: boolean;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

/** GET /teams/:id/ — roster included */
export interface TeamDetail extends Team {
  members: MemberMinimal[];
}

export interface SSHKey {
  id: number;
  member: number;
  label: string;
  public_key: string;
  created_at: string;
}

/** PATCH label and/or public_key on a member's SSH key. */
export async function patchMemberSSHKey(
  memberId: number,
  keyId: number,
  payload: { label?: string; public_key?: string }
): Promise<SSHKey> {
  return apiFetch<SSHKey>(`/members/${memberId}/keys/${keyId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface Member {
  id: number;
  username: string;
  email: string;
  access_revoked?: boolean;
  teams: { id: number; name: string }[];
  ssh_keys: SSHKey[];
  created_at: string;
  updated_at?: string;
}

/** Worst heartbeat bucket across environments (GET /projects/). */
export type ProjectEnvironmentWorstStatus = "live" | "stale" | "dead";

export interface Project {
  id: number;
  name: string;
  description: string;
  tags: string[];
  environment_count?: number;
  access_row_count?: number;
  environment_worst_status?: ProjectEnvironmentWorstStatus;
  created_at: string;
  updated_at: string;
}

export interface ServerGroup {
  id: number;
  project: number | null;
  project_name?: string;
  name: string;
  description: string;
  supplemental_groups?: string[];
  provision_token: string;
  server_count?: number;
  assignment_count?: number;
  created_at: string;
}

export type ServerStatus = "online" | "stale" | "dead";

export type HeartbeatRhythmStatus =
  | "stable"
  | "warning"
  | "degrading"
  | "offline"
  | "unknown";

export interface ServerReplacementHint {
  id: number;
  hostname: string;
}

export interface Server {
  id: number;
  name: string;
  hostname: string;
  server_group: number;
  server_group_name: string;
  project_name: string | null;
  ip_address: string | null;
  last_seen: string | null;
  created_at: string;
  status: ServerStatus;
  seconds_since_seen: number | null;
  likely_replaced_by: ServerReplacementHint | null;
  /** Twelve booleans: 5-minute buckets over the last 60 minutes, oldest first. */
  heartbeat_windows?: boolean[];
  heartbeat_expected?: number;
  heartbeat_received?: number;
  heartbeat_missed?: number;
  heartbeat_rhythm_status?: HeartbeatRhythmStatus;
  heartbeat_window_minutes?: number;
  heartbeat_interval_minutes?: number;
}

export interface PruneServersRequest {
  server_group?: number;
  older_than_hours?: number;
}

export interface PruneServersResponse {
  deleted: number;
  ids: number[];
}

export function pruneServers(
  body: PruneServersRequest = {}
): Promise<PruneServersResponse> {
  return apiFetch<PruneServersResponse>("/servers/prune/", {
    method: "POST",
    body: JSON.stringify({ older_than_hours: 24, ...body }),
  });
}

export interface Assignment {
  id: number;
  team: number | null;
  member: number | null;
  server_group: number;
  team_name: string | null;
  member_username: string | null;
  server_group_name: string;
  role: "user" | "sudo" | "removed";
}

export interface RecentServerActivity {
  id: number;
  hostname: string;
  server_group_name: string;
  last_seen: string | null;
}

export interface DashboardStats {
  projects: number;
  members: number;
  servers_online: number;
  recent_activity: RecentServerActivity[];
}

export interface HealthStatus {
  api: boolean;
  database: boolean;
  uptime_seconds: number;
  heartbeat_freshness: {
    total_servers: number;
    online: number;
    stale: number;
  };
}

export interface ProjectAccessEnvironment {
  id: number;
  name: string;
  provision_token: string;
  supplemental_groups: string[];
}

export interface ProjectAccessCell {
  server_group_id: number;
  role: "user" | "sudo" | "removed" | null;
  assignment_id: number | null;
}

export interface ProjectAccessTeamRow {
  principal_type: "team";
  team: { id: number; name: string };
  cells: ProjectAccessCell[];
}

export interface ProjectAccessMemberRow {
  principal_type: "member";
  member: {
    id: number;
    username: string;
    email: string;
    access_revoked?: boolean;
  };
  cells: ProjectAccessCell[];
}

export interface ProjectAccessResponse {
  environments: ProjectAccessEnvironment[];
  team_rows: ProjectAccessTeamRow[];
  member_rows: ProjectAccessMemberRow[];
  revoked_member_rows: ProjectAccessMemberRow[];
}

export type AccessRequestKind = "access" | "key";
export type AccessRequestStatus = "pending" | "approved" | "denied";

export interface AccessRequest {
  id: number;
  kind: AccessRequestKind;
  status: AccessRequestStatus;
  member: MemberMinimal;
  project: number | null;
  project_name: string | null;
  server_group: number | null;
  server_group_name: string | null;
  server: number | null;
  team: number | null;
  team_name: string | null;
  role_requested: "user" | "sudo";
  key_label: string;
  algorithm: string;
  note: string;
  admin_note: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  private_key?: string;
}

export interface AccessRequestInput {
  kind: AccessRequestKind;
  project?: number | null;
  server_group?: number | null;
  server?: number | null;
  team?: number | null;
  role_requested?: "user" | "sudo";
  key_label?: string;
  algorithm?: string;
  note?: string;
}

export function fetchAccessRequests(params: {
  status?: AccessRequestStatus;
  kind?: AccessRequestKind;
} = {}): Promise<AccessRequest[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.kind) qs.set("kind", params.kind);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<AccessRequest[]>(`/access-requests/${suffix}`);
}

export function createAccessRequest(
  payload: AccessRequestInput
): Promise<AccessRequest> {
  return apiFetch<AccessRequest>("/access-requests/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function grantAccessRequest(id: number): Promise<AccessRequest> {
  return apiFetch<AccessRequest>(`/access-requests/${id}/grant/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function denyAccessRequest(id: number): Promise<AccessRequest> {
  return apiFetch<AccessRequest>(`/access-requests/${id}/deny/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function inviteMember(id: number): Promise<{ member: number; user: number; sent: boolean }> {
  return apiFetch<{ member: number; user: number; sent: boolean }>(
    `/members/${id}/invite/`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}
