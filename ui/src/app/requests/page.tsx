"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import {
  AccessRequest,
  denyAccessRequest,
  fetchAccessRequests,
  grantAccessRequest,
} from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isAdminRole } from "@/lib/roles";

type Filter = "pending" | "access" | "key" | "resolved";

function requestTarget(req: AccessRequest): string {
  return (
    req.server_group_name ||
    req.project_name ||
    req.team_name ||
    (req.server ? `Server #${req.server}` : "Workspace")
  );
}

export default function RequestsPage() {
  const { workspace, refresh } = useWorkspace();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [oneTimeKey, setOneTimeKey] = useState<{
    member: string;
    privateKey: string;
  } | null>(null);

  const isAdmin = isAdminRole(workspace);
  const load = useCallback(() => {
    if (!isAdmin) return;
    fetchAccessRequests().then(setRequests);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = requests.filter((req) => req.status === "pending").length;
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((req) => {
      const matchesFilter =
        filter === "pending"
          ? req.status === "pending"
          : filter === "resolved"
            ? req.status !== "pending"
            : req.kind === filter;
      if (!matchesFilter) return false;
      if (!term) return true;
      const haystack = [
        req.member?.username,
        req.member?.email,
        req.kind,
        req.status,
        requestTarget(req),
        req.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, requests, search]);

  const resolve = async (req: AccessRequest, action: "grant" | "deny") => {
    setBusyId(req.id);
    try {
      const next =
        action === "grant"
          ? await grantAccessRequest(req.id)
          : await denyAccessRequest(req.id);
      if (next.private_key) {
        setOneTimeKey({
          member: req.member?.username || "member",
          privateKey: next.private_key,
        });
      }
      setRequests((prev) => prev.map((row) => (row.id === req.id ? next : row)));
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-sanctum-muted">
        Requests are available to workspace admins.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Requests"
        subtitle="Review member access and SSH key requests."
      />

      {oneTimeKey ? (
        <div className="mb-5 rounded-lg border border-warning/40 bg-warning-surface p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-warning">
              One-time private key for {oneTimeKey.member}
            </p>
            <button
              type="button"
              onClick={() => setOneTimeKey(null)}
              className="text-xs text-sanctum-muted hover:text-sanctum-mist"
            >
              Dismiss
            </button>
          </div>
          <p className="mb-2 text-xs text-sanctum-muted">
            Save or deliver this private key now. It is not stored by Sanctum.
          </p>
          <textarea
            readOnly
            value={oneTimeKey.privateKey}
            className="sanctum-input min-h-[10rem] font-mono text-xs"
          />
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requests by member or target..."
          className="sanctum-input max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {(["pending", "access", "key", "resolved"] as Filter[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
                filter === id
                  ? "border-sanctum-accent bg-sanctum-accent/10 text-sanctum-accent"
                  : "border-sanctum-line text-sanctum-muted hover:text-sanctum-mist"
              }`}
            >
              {id === "pending" ? `Pending (${pendingCount})` : id}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visible.map((req) => (
          <div
            key={req.id}
            className="sanctum-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded bg-sanctum-line/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-sanctum-mist">
                  {req.kind}
                </span>
                <span className="font-semibold text-sanctum-mist">
                  {req.member?.username || "Unknown member"}
                </span>
                <span className="text-sm text-sanctum-muted">
                  requests {requestTarget(req)}
                </span>
              </div>
              <p className="text-sm text-sanctum-muted">
                {req.kind === "access"
                  ? `Role: ${req.role_requested}`
                  : `Key: ${req.key_label || "Generated key"}`}
                {req.note ? ` · ${req.note}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {req.status === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void resolve(req, "deny")}
                    disabled={busyId === req.id}
                    className="btn-secondary text-sm"
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    onClick={() => void resolve(req, "grant")}
                    disabled={busyId === req.id}
                    className="btn-primary text-sm"
                  >
                    Grant
                  </button>
                </>
              ) : (
                <span
                  className={`status-pill-${req.status === "approved" ? "success" : "danger"}`}
                >
                  {req.status === "approved" ? "Granted" : "Denied"}
                </span>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="rounded-lg border border-sanctum-line bg-sanctum-surface p-8 text-center text-sm text-sanctum-muted">
            No matching requests.
          </div>
        ) : null}
      </div>
    </div>
  );
}
