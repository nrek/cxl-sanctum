"use client";

import { useMemo, useState } from "react";
import { apiFetch, pruneServers, type Server, type ServerStatus } from "@/lib/api";
import Modal from "./Modal";
import Tooltip from "./Tooltip";

interface ServerInventoryProps {
  servers: Server[];
  environmentId: number;
  environmentName: string;
  onChange: () => void;
}

type Tab = "all" | ServerStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "stale", label: "Stale" },
  { id: "dead", label: "Dead" },
];

function humanizeSeconds(secs: number | null): string {
  if (secs === null) return "never";
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function statusClass(s: ServerStatus): string {
  switch (s) {
    case "online":
      return "bg-success/15 text-success";
    case "stale":
      return "bg-warning/15 text-warning";
    case "dead":
      return "bg-danger/15 text-danger";
  }
}

export default function ServerInventory({
  servers,
  environmentId,
  environmentName,
  onChange,
}: ServerInventoryProps) {
  const [tab, setTab] = useState<Tab>("all");
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pruneOpen, setPruneOpen] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: servers.length,
      online: 0,
      stale: 0,
      dead: 0,
    };
    for (const s of servers) c[s.status] += 1;
    return c;
  }, [servers]);

  const visible = useMemo(() => {
    if (tab === "all") return servers;
    return servers.filter((s) => s.status === tab);
  }, [servers, tab]);

  const deadServers = useMemo(
    () => servers.filter((s) => s.status === "dead"),
    [servers]
  );

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteConfirm("");
    setError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const expected = deleteTarget.hostname || deleteTarget.name;
    if (deleteConfirm.trim() !== expected) {
      setError(`Type "${expected}" to confirm.`);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/servers/${deleteTarget.id}/`, { method: "DELETE" });
      closeDelete();
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const confirmPrune = async () => {
    setPruning(true);
    setError(null);
    try {
      const res = await pruneServers({
        server_group: environmentId,
        older_than_hours: 24,
      });
      setPruneOpen(false);
      onChange();
      if (res.deleted === 0) {
        setError("Nothing was pruned — rows may have become fresh between view and action.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prune failed");
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-sanctum-line/15 bg-sanctum-ink/30 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Server status">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`rounded px-2 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-sanctum-line/30 text-sanctum-mist"
                    : "text-sanctum-muted hover:text-sanctum-mist"
                }`}
              >
                {t.label} <span className="opacity-70">({counts[t.id]})</span>
              </button>
            );
          })}
        </div>
        {tab === "dead" && deadServers.length > 0 && (
          <button
            type="button"
            onClick={() => setPruneOpen(true)}
            className="btn-danger text-xs"
          >
            <i className="fa-solid fa-broom" aria-hidden />
            Prune dead ({deadServers.length})
          </button>
        )}
      </div>

      {servers.length === 0 ? (
        <p className="text-xs text-sanctum-muted">
          No heartbeats received yet for this environment. Run the commands
          above on a server and it will appear here within about a minute of
          the first cron tick.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-sanctum-muted">
          No servers in the <strong className="text-sanctum-mist">{tab}</strong>{" "}
          bucket.
        </p>
      ) : (
        <ul className="divide-y divide-sanctum-line/15">
          {visible.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 py-2 text-sm"
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(s.status)}`}
              >
                {s.status}
              </span>
              <span className="font-mono text-sanctum-mist">
                {s.hostname || s.name}
              </span>
              <span className="font-mono text-xs text-sanctum-muted">
                {s.ip_address || "—"}
              </span>
              <span
                className="text-xs text-sanctum-muted"
                title={s.last_seen ? new Date(s.last_seen).toLocaleString() : ""}
              >
                {humanizeSeconds(s.seconds_since_seen)}
              </span>
              {s.likely_replaced_by && (
                <span className="rounded bg-sanctum-line/15 px-1.5 py-0.5 text-[11px] text-sanctum-mist">
                  likely replaced by{" "}
                  <code className="font-mono">
                    {s.likely_replaced_by.hostname}
                  </code>
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Tooltip
                  label={
                    s.status === "dead"
                      ? "Delete this dead server row"
                      : "Delete this server (type hostname to confirm)"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(s);
                      setDeleteConfirm("");
                      setError(null);
                    }}
                    className="icon-btn-danger"
                    aria-label={`Delete ${s.hostname || s.name}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden />
                  </button>
                </Tooltip>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={closeDelete}
        title="Delete server record"
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-sm">
              This deletes the row for{" "}
              <code className="font-mono text-sanctum-mist">
                {deleteTarget.hostname || deleteTarget.name}
              </code>
              . If this server is still alive and cron is still running, it
              will re-register on the next heartbeat — use this for replaced
              or decommissioned machines.
            </p>
            <label className="block text-xs text-sanctum-muted">
              Type the hostname to confirm:
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="mt-1 w-full rounded border border-sanctum-line/30 bg-sanctum-ink/60 px-2 py-1.5 font-mono text-sm text-sanctum-mist focus:border-sanctum-line/60 focus:outline-none"
                autoFocus
              />
            </label>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeDelete}
                className="btn-secondary text-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn-danger text-sm"
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={pruneOpen}
        onClose={() => (pruning ? undefined : setPruneOpen(false))}
        title={`Prune dead servers in ${environmentName}`}
      >
        <div className="space-y-3">
          <p className="text-sm">
            About to delete{" "}
            <strong className="text-sanctum-mist">{deadServers.length}</strong>{" "}
            server row{deadServers.length === 1 ? "" : "s"} not seen in the last
            24 hours in <strong className="text-sanctum-mist">{environmentName}</strong>.
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-sanctum-line/20 bg-sanctum-ink/50 p-2 text-xs">
            {deadServers.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <code className="font-mono text-sanctum-mist">
                  {s.hostname || s.name}
                </code>
                <span className="text-sanctum-muted">
                  {s.ip_address || "—"} · {humanizeSeconds(s.seconds_since_seen)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-sanctum-muted">
            Any row whose server is still alive will re-register on the next
            heartbeat. Rows for decommissioned or replaced servers stay gone.
          </p>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPruneOpen(false)}
              className="btn-secondary text-sm"
              disabled={pruning}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmPrune}
              className="btn-danger text-sm"
              disabled={pruning}
            >
              {pruning ? "Pruning…" : `Prune ${deadServers.length}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
