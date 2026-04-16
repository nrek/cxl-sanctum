"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  BillingStatus,
  DashboardStats,
  fetchBillingStatus,
  HealthStatus,
  openBillingPortal,
  Server,
  startProCheckout,
  WorkspaceSummary,
} from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const ACTIVE_CONNECTIONS_PAGE_SIZE = 8;

const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL || "";

const STAT_CARDS = [
  { key: "projects" as const, label: "Projects", dot: "bg-sanctum-accent" },
  { key: "members" as const, label: "Members", dot: "bg-success" },
  {
    key: "servers_online" as const,
    label: "Servers online",
    dot: "bg-warning",
  },
];

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 48) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function heartbeatDotClass(h: HealthStatus["heartbeat_freshness"]): string {
  const { total_servers, online } = h;
  if (total_servers === 0) return "bg-sanctum-muted";
  if (online === total_servers) return "bg-success";
  if (online > 0) return "bg-warning";
  return "bg-red-500";
}

export default function DashboardPage() {
  const { workspace: ctxWorkspace, loading: wsLoading } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingAction, setBillingAction] = useState(false);
  const [servers, setServers] = useState<Server[] | null>(null);
  const [connectionsPage, setConnectionsPage] = useState(0);

  const workspace: WorkspaceSummary | null = ctxWorkspace;

  const loadBilling = useCallback(() => {
    const role = workspace?.role ?? "owner";
    if (!workspace || role !== "owner") {
      setBilling(null);
      return;
    }
    fetchBillingStatus().then(setBilling);
  }, [workspace]);

  useEffect(() => {
    apiFetch<DashboardStats>("/stats/").then(setStats);
    apiFetch<HealthStatus>("/health/").then(setHealth);
    apiFetch<Server[]>("/servers/").then(setServers);
  }, []);

  const activeConnections = useMemo(() => {
    if (!servers) return [];
    return servers.filter((s) => s.last_seen !== null);
  }, [servers]);

  const connectionsPageCount = Math.max(
    1,
    Math.ceil(activeConnections.length / ACTIVE_CONNECTIONS_PAGE_SIZE)
  );

  useEffect(() => {
    if (connectionsPage >= connectionsPageCount) {
      setConnectionsPage(Math.max(0, connectionsPageCount - 1));
    }
  }, [connectionsPage, connectionsPageCount]);

  const pagedConnections = useMemo(() => {
    const start = connectionsPage * ACTIVE_CONNECTIONS_PAGE_SIZE;
    return activeConnections.slice(start, start + ACTIVE_CONNECTIONS_PAGE_SIZE);
  }, [activeConnections, connectionsPage]);

  useEffect(() => {
    if (!wsLoading) {
      loadBilling();
    }
  }, [wsLoading, loadBilling]);

  const envLabel = () => {
    if (!workspace) return null;
    const n = workspace.environment_count;
    const lim = billing?.environment_limit ?? workspace.environment_limit;
    if (lim === null) {
      return `${n} (unlimited)`;
    }
    return `${n} / ${lim}`;
  };

  const handleUpgrade = async () => {
    setBillingAction(true);
    try {
      const url = await startProCheckout();
      window.location.href = url;
    } catch {
      setBillingAction(false);
    }
  };

  const handlePortal = async () => {
    setBillingAction(true);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch {
      setBillingAction(false);
    }
  };

  const isOwner = (workspace?.role ?? "owner") === "owner";
  const showHostedBilling = isOwner && billing !== null;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-sanctum-mist">Dashboard</h1>

      {workspace && (
        <div className="sanctum-card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-sanctum-muted">Environments</p>
            <p className="text-lg font-semibold tabular-nums text-sanctum-mist">
              {envLabel()}
              {showHostedBilling && billing.plan === "pro" ? (
                <span className="ml-2 text-sm font-normal text-success">
                  Pro
                </span>
              ) : null}
            </p>
            {workspace.deployment_mode === "self_hosted" && !showHostedBilling ? (
              <p className="mt-1 text-xs text-sanctum-muted">
                Self-hosted — no environment cap.
              </p>
            ) : null}
          </div>
          {showHostedBilling ? (
            <div className="flex flex-wrap gap-2">
              {billing.plan === "free" ? (
                <button
                  type="button"
                  disabled={billingAction}
                  onClick={() => void handleUpgrade()}
                  className="btn-primary text-sm"
                >
                  {billingAction ? "Redirecting…" : "Upgrade to Pro ($20/mo)"}
                </button>
              ) : null}
              {billing.has_stripe_customer ? (
                <button
                  type="button"
                  disabled={billingAction}
                  onClick={() => void handlePortal()}
                  className="btn-secondary text-sm"
                >
                  {billingAction ? "…" : "Manage subscription"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {health ? (
        <div className="sanctum-card mb-6 flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="text-sanctum-muted">System</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sanctum-line/20 bg-sanctum-bg/40 px-2.5 py-1">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            <span className="text-sanctum-muted">API</span>
            <span className="text-sanctum-mist">Online</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sanctum-line/20 bg-sanctum-bg/40 px-2.5 py-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                health.database ? "bg-success" : "bg-red-500"
              }`}
            />
            <span className="text-sanctum-muted">Database</span>
            <span className="text-sanctum-mist">
              {health.database ? "Connected" : "Down"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sanctum-line/20 bg-sanctum-bg/40 px-2.5 py-1">
            <span className="text-sanctum-muted">Worker uptime</span>
            <span className="tabular-nums text-sanctum-mist">
              {formatUptime(health.uptime_seconds)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sanctum-line/20 bg-sanctum-bg/40 px-2.5 py-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${heartbeatDotClass(
                health.heartbeat_freshness
              )}`}
            />
            <span className="text-sanctum-muted">Heartbeats</span>
            <span className="tabular-nums text-sanctum-mist">
              {health.heartbeat_freshness.total_servers === 0
                ? "No servers yet"
                : `${health.heartbeat_freshness.online}/${health.heartbeat_freshness.total_servers} online`}
            </span>
          </span>
        </div>
      ) : null}

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="sanctum-card p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${card.dot}`} />
              <span className="text-sm text-sanctum-muted">{card.label}</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-sanctum-mist">
              {stats ? stats[card.key] : "\u2014"}
            </p>
          </div>
        ))}
      </div>

      <div className="sanctum-card p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-sanctum-mist">
            Active Connections
          </h2>
          {activeConnections.length > 0 && (
            <span className="text-xs text-sanctum-muted tabular-nums">
              {activeConnections.length} total
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-sanctum-muted">
          A server counts as online when its last heartbeat is within about 10
          minutes. If a host never appears or stays stale, check{" "}
          <code className="rounded bg-sanctum-line/15 px-1 text-sanctum-mist">
            /etc/cron.d/sanctum
          </code>
          , the provision token, and DNS reachability to the API on 443.
        </p>
        {servers === null ? (
          <p className="text-sm text-sanctum-muted">Loading…</p>
        ) : activeConnections.length === 0 ? (
          <p className="text-sm text-sanctum-muted">No heartbeats yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-sanctum-line/25 text-left text-xs uppercase tracking-wider text-sanctum-muted">
                    <th className="py-2 pr-4 font-medium">Project</th>
                    <th className="py-2 pr-4 font-medium">Environment</th>
                    <th className="py-2 pr-4 font-medium">Hostname</th>
                    <th className="py-2 pr-4 font-medium">Public IP</th>
                    <th className="py-2 pr-4 font-medium">Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sanctum-line/15">
                  {pagedConnections.map((s) => (
                    <tr key={s.id} className="text-sanctum-mist">
                      <td className="py-2 pr-4 lowercase">
                        {s.project_name ?? (
                          <span className="text-sanctum-muted">ungrouped</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{s.server_group_name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {s.hostname || s.name}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {s.ip_address || (
                          <span className="text-sanctum-muted">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-xs text-sanctum-muted tabular-nums">
                        {s.last_seen
                          ? new Date(s.last_seen).toLocaleString()
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {connectionsPageCount > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-sanctum-muted">
                <span className="tabular-nums">
                  Page {connectionsPage + 1} of {connectionsPageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConnectionsPage((p) => Math.max(0, p - 1))
                    }
                    disabled={connectionsPage === 0}
                    className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <i className="fa-solid fa-chevron-left" aria-hidden />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConnectionsPage((p) =>
                        Math.min(connectionsPageCount - 1, p + 1)
                      )
                    }
                    disabled={connectionsPage >= connectionsPageCount - 1}
                    className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <i className="fa-solid fa-chevron-right" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {DONATION_URL ? (
        <p className="mt-8 text-center text-xs text-sanctum-muted">
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="link-accent"
          >
            Support SANCTUM
          </a>{" "}
          (optional)
        </p>
      ) : null}
    </div>
  );
}
