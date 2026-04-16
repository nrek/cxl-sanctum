"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiFetch,
  BillingStatus,
  DashboardStats,
  fetchBillingStatus,
  openBillingPortal,
  startProCheckout,
  WorkspaceSummary,
} from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";

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

export default function DashboardPage() {
  const { workspace: ctxWorkspace, loading: wsLoading } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingAction, setBillingAction] = useState(false);

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
  }, []);

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
        <h2 className="mb-4 text-lg font-semibold text-sanctum-mist">
          Recent server activity
        </h2>
        {!stats || stats.recent_activity.length === 0 ? (
          <p className="text-sm text-sanctum-muted">No heartbeats yet.</p>
        ) : (
          <ul className="divide-y divide-sanctum-line/15">
            {stats.recent_activity.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium text-sanctum-mist">
                  {s.hostname}
                </span>
                <span className="text-sanctum-muted">{s.server_group_name}</span>
                <span className="text-xs text-sanctum-muted">
                  {s.last_seen ? new Date(s.last_seen).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
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
