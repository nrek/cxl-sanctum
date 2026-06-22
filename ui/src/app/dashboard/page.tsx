"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { HeartbeatRhythm } from "@/components/HeartbeatRhythm";
import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import UsageMeter from "@/components/UsageMeter";
import StatusDot from "@/components/StatusDot";
import type { HeartbeatRhythmStatus } from "@/lib/api";
import { canManageBilling, canViewBilling, isAdminRole } from "@/lib/roles";

const PAGE_SIZE_OPTIONS = [8, 15, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 8;

const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL || "";

const STAT_CARDS = [
  { key: "projects" as const, label: "Projects", href: "/projects" },
  { key: "members" as const, label: "Members", href: "/members" },
  {
    key: "servers_online" as const,
    label: "Servers online",
    href: null as string | null,
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

function formatHeartbeatAgo(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 48) return rem > 0 ? `${h}h ${rem}m ago` : `${h}h ago`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return `${d}d ${hr}h ago`;
}

function rhythmStatusOrUnknown(
  s: string | undefined
): HeartbeatRhythmStatus {
  if (
    s === "stable" ||
    s === "warning" ||
    s === "degrading" ||
    s === "offline" ||
    s === "unknown"
  ) {
    return s;
  }
  return "unknown";
}

export default function DashboardPage() {
  const { workspace: ctxWorkspace, loading: wsLoading } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingAction, setBillingAction] = useState(false);
  const [servers, setServers] = useState<Server[] | null>(null);
  const [connectionsPage, setConnectionsPage] = useState(0);
  const [pageSize, setPageSize] = useLocalStorage<number>(
    "sanctum_connections_page_size",
    DEFAULT_PAGE_SIZE
  );

  const workspace: WorkspaceSummary | null = ctxWorkspace;

  const loadBilling = useCallback(() => {
    if (!workspace || !canViewBilling(workspace)) {
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
    Math.ceil(activeConnections.length / pageSize)
  );

  useEffect(() => {
    if (connectionsPage >= connectionsPageCount) {
      setConnectionsPage(Math.max(0, connectionsPageCount - 1));
    }
  }, [connectionsPage, connectionsPageCount]);

  const pagedConnections = useMemo(() => {
    const start = connectionsPage * pageSize;
    return activeConnections.slice(start, start + pageSize);
  }, [activeConnections, connectionsPage, pageSize]);

  useEffect(() => {
    if (!wsLoading) {
      loadBilling();
    }
  }, [wsLoading, loadBilling]);

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

  const manageBilling = canManageBilling(workspace);
  const showHostedBilling = canViewBilling(workspace) && billing !== null;
  const adminRole = isAdminRole(workspace);

  const envLimit =
    billing?.environment_limit ?? workspace?.environment_limit ?? null;
  const envCount = workspace?.environment_count ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Workspace operations at a glance."
      />

      {workspace ? (
        <div className="sanctum-card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <UsageMeter
            label="Environments"
            current={envCount}
            limit={envLimit}
            showUpgradeHint={showHostedBilling && billing?.plan === "free"}
          />
          {showHostedBilling ? (
            <div className="flex flex-wrap gap-2">
              {manageBilling && billing.plan === "free" ? (
                <button
                  type="button"
                  disabled={billingAction}
                  onClick={() => void handleUpgrade()}
                  className="btn-primary whitespace-nowrap text-sm"
                >
                  {billingAction ? "Redirecting…" : "Upgrade to Pro →"}
                </button>
              ) : billing.plan !== "free" ? (
                <span className="status-pill-success">Pro</span>
              ) : (
                <span className="status-pill-warning">Free</span>
              )}
              {manageBilling && billing.has_stripe_customer ? (
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
          ) : workspace.deployment_mode === "self_hosted" ? (
            <p className="text-xs text-sanctum-muted">
              Self-hosted — no environment cap.
            </p>
          ) : null}
        </div>
      ) : null}

      {health ? (
        <div className="sanctum-card mb-6 p-5">
          <div className="label-caps mb-4">System health</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2.5">
              <StatusDot variant="success" label="API online" />
              <div>
                <div className="text-sm font-semibold">API online</div>
                <div className="text-xs text-sanctum-muted">Responding</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <StatusDot
                variant={health.database ? "success" : "danger"}
                label="Database"
              />
              <div>
                <div className="text-sm font-semibold">Database</div>
                <div className="text-xs text-sanctum-muted">
                  {health.database ? "Connected" : "Down"}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Worker uptime</div>
              <div className="font-mono text-xs text-sanctum-muted">
                {formatUptime(health.uptime_seconds)}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Heartbeats</div>
              <div className="font-mono text-xs text-sanctum-muted">
                {health.heartbeat_freshness.total_servers === 0
                  ? "No servers yet"
                  : `${health.heartbeat_freshness.online}/${health.heartbeat_freshness.total_servers} online`}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            value={stats ? stats[card.key] : "—"}
            href={card.key === "members" && !adminRole ? undefined : card.href ?? undefined}
          />
        ))}
      </div>

      <div className="sanctum-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sanctum-line px-5 py-4">
          <h2 className="font-display text-base font-bold text-sanctum-mist">
            Active connections
          </h2>
          <span className="font-mono text-[11px] text-sanctum-muted">
            last 60 min · 5min buckets
          </span>
        </div>
        <div className="px-5 pb-5">
          <p className="mb-4 text-xs text-sanctum-muted">
            Rhythm shows the last hour in 5-minute buckets. Check{" "}
            <code className="rounded bg-sanctum-terminal px-1 font-mono text-sanctum-mist">
              /etc/cron.d/sanctum
            </code>{" "}
            if a host stays stale.
          </p>
          {activeConnections.length > 0 ? (
            <div className="mb-3 flex justify-end">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setConnectionsPage(0);
                }}
                className="sanctum-select px-1.5 py-1 text-xs"
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
                    <th className="py-2 pr-4 font-medium">Rhythm</th>
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
                      <td className="py-2 pr-4 align-middle">
                        <HeartbeatRhythm
                          windows={s.heartbeat_windows ?? []}
                          status={rhythmStatusOrUnknown(s.heartbeat_rhythm_status)}
                        />
                      </td>
                      <td className="py-2 pr-4 text-xs text-sanctum-muted tabular-nums">
                        {formatHeartbeatAgo(s.seconds_since_seen)}
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
