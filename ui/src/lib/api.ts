/** API root ending in `/api`. If unset: local dev uses :8000; deployed HTTPS uses same origin + `/api` (Apache proxies `/api`). */
function getApiBase(): string {
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

/** GET /workspace/ — environment usage (core + SaaS). */
export interface WorkspaceSummary {
  id: number;
  name: string;
  environment_count: number;
  environment_limit: number | null;
  deployment_mode: string;
  /** Account owner vs workspace admin (team lead). Omitted on older APIs (treated as owner). */
  role?: "owner" | "admin";
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

/** GET /billing/status/ — hosted SaaS only; returns null on OSS / missing route. */
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

/** POST /billing/checkout/ — Stripe Checkout URL for Pro (SaaS only). */
export async function startProCheckout(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/billing/checkout/", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data.url;
}

/** POST /billing/portal/ — Stripe Customer Portal URL (SaaS only). */
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

export interface Project {
  id: number;
  name: string;
  description: string;
  environment_count?: number;
  access_row_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ServerGroup {
  id: number;
  project: number | null;
  project_name?: string;
  name: string;
  description: string;
  provision_token: string;
  server_count?: number;
  assignment_count?: number;
  created_at: string;
}

export interface Server {
  id: number;
  name: string;
  hostname: string;
  server_group: number;
  server_group_name: string;
  ip_address: string | null;
  last_seen: string | null;
  created_at: string;
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

export interface ProjectAccessEnvironment {
  id: number;
  name: string;
  provision_token: string;
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
