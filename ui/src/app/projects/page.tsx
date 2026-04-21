"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, getApiBase, Project, ServerGroup } from "@/lib/api";
import ProvisionSnippets from "@/components/ProvisionSnippets";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";
import ViewToggle from "@/components/ViewToggle";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ungrouped, setUngrouped] = useState<ServerGroup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [deleteUngrouped, setDeleteUngrouped] = useState<ServerGroup | null>(
    null
  );
  const [deleteUngroupedConfirm, setDeleteUngroupedConfirm] = useState("");
  const [deletingUngrouped, setDeletingUngrouped] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<"tiles" | "rows">(
    "sanctum_projects_view",
    "tiles"
  );

  const load = useCallback(() => {
    apiFetch<Project[]>("/projects/").then(setProjects);
    apiFetch<ServerGroup[]>("/server-groups/?ungrouped=1").then(setUngrouped);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apiBase =
    typeof window !== "undefined" ? getApiBase() : "";

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiFetch(`/projects/${editing.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description,
        }),
      });
    } else {
      await apiFetch("/projects/", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    setEditing(null);
    setForm({ name: "", description: "" });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this project and all its environments?")) return;
    await apiFetch(`/projects/${id}/`, { method: "DELETE" });
    load();
  };

  const handleDeleteUngrouped = async () => {
    if (!deleteUngrouped || deleteUngroupedConfirm !== deleteUngrouped.name) {
      return;
    }
    setDeletingUngrouped(true);
    try {
      await apiFetch(`/server-groups/${deleteUngrouped.id}/`, {
        method: "DELETE",
      });
      setDeleteUngrouped(null);
      setDeleteUngroupedConfirm("");
      load();
    } finally {
      setDeletingUngrouped(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sanctum-mist">Projects</h1>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary"
          >
            <i className="fa-solid fa-circle-plus" aria-hidden />
            New Project
          </button>
        </div>
      </div>

      {viewMode === "tiles" ? (
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="sanctum-card relative p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link
                  href={`/projects/${p.id}`}
                  className="text-lg font-semibold text-sanctum-mist hover:text-sanctum-accent"
                >
                  {p.name}
                </Link>
                <div className="flex shrink-0 items-center gap-0.5 -mr-1 -mt-1">
                  <Tooltip label="Edit name and description">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded p-1.5 text-sanctum-muted transition-colors hover:bg-white/10 hover:text-sanctum-mist"
                      aria-label="Edit project"
                    >
                      <i className="fa-solid fa-pen" aria-hidden />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete project">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="icon-btn-danger"
                      aria-label="Delete project"
                    >
                      <i className="fa-solid fa-trash" aria-hidden />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-sanctum-muted">
                {p.description || "No description"}
              </p>
              <div className="flex gap-4 text-sm text-sanctum-muted">
                <span>{p.environment_count ?? 0} environments</span>
                <span>{p.access_row_count ?? 0} access rows</span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="col-span-full py-8 text-center text-sanctum-muted">
              No projects yet. Create one to group Development, Staging, and
              Production servers.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-10 space-y-1">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-lg border border-sanctum-line/20 bg-sanctum-surface px-4 py-3 shadow-sm"
            >
              <Link
                href={`/projects/${p.id}`}
                className="min-w-0 shrink-0 text-sm font-semibold text-sanctum-mist hover:text-sanctum-accent"
                style={{ width: "clamp(8rem, 20%, 14rem)" }}
              >
                {p.name}
              </Link>
              <p className="min-w-0 flex-1 truncate text-sm text-sanctum-muted">
                {p.description || "No description"}
              </p>
              <span className="shrink-0 text-xs text-sanctum-muted whitespace-nowrap">
                {p.environment_count ?? 0} env
              </span>
              <span className="shrink-0 text-xs text-sanctum-muted whitespace-nowrap">
                {p.access_row_count ?? 0} access
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <Tooltip label="Edit name and description">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded p-1.5 text-sanctum-muted transition-colors hover:bg-white/10 hover:text-sanctum-mist"
                    aria-label="Edit project"
                  >
                    <i className="fa-solid fa-pen text-xs" aria-hidden />
                  </button>
                </Tooltip>
                <Tooltip label="Delete project">
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="icon-btn-danger"
                    aria-label="Delete project"
                  >
                    <i className="fa-solid fa-trash text-xs" aria-hidden />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="py-8 text-center text-sanctum-muted">
              No projects yet. Create one to group Development, Staging, and
              Production servers.
            </p>
          )}
        </div>
      )}

      {ungrouped.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-sanctum-mist">
            Ungrouped environments
          </h2>
          <p className="mb-4 text-sm text-sanctum-muted">
            These server groups are not under a project. Assign them when you
            create or open a project, or keep them here for ad-hoc servers.
          </p>
          <p className="mb-3 text-xs leading-relaxed text-sanctum-muted">
            If HTTPS to the API&apos;s public IP times out from inside the same VPC
            (hairpin), map the API hostname to its private IP in{" "}
            <code className="rounded bg-sanctum-line/15 px-1 text-sanctum-mist">
              /etc/hosts
            </code>
            .
          </p>
          <div className="space-y-4">
            {ungrouped.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-sanctum-line/20 bg-sanctum-surface px-4 py-3"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-sanctum-mist">{g.name}</span>
                  <Tooltip label="Remove this ungrouped environment">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteUngroupedConfirm("");
                        setDeleteUngrouped(g);
                      }}
                      className="icon-btn-danger shrink-0"
                      aria-label={`Remove ${g.name}`}
                    >
                      <i className="fa-solid fa-trash" aria-hidden />
                    </button>
                  </Tooltip>
                </div>
                <ProvisionSnippets
                  apiBase={apiBase}
                  token={g.provision_token}
                  variant="dense"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit project" : "New Project"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Client Acme or Our Product"
              className="sanctum-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="sanctum-input min-h-[5rem]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? (
                <>
                  <i className="fa-solid fa-check" aria-hidden />
                  Save
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-plus" aria-hidden />
                  Create
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteUngrouped !== null}
        onClose={() => {
          setDeleteUngrouped(null);
          setDeleteUngroupedConfirm("");
        }}
        title="Remove ungrouped environment"
      >
        {deleteUngrouped ? (
          <div className="space-y-4">
            <p className="text-sm text-sanctum-muted">
              Removes{" "}
              <strong className="text-sanctum-mist">{deleteUngrouped.name}</strong>{" "}
              and its assignments and server records. Type the name to confirm.
            </p>
            <input
              type="text"
              value={deleteUngroupedConfirm}
              onChange={(e) => setDeleteUngroupedConfirm(e.target.value)}
              placeholder={deleteUngrouped.name}
              className="sanctum-input"
              autoComplete="off"
              aria-label="Type environment name to confirm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteUngrouped(null);
                  setDeleteUngroupedConfirm("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deletingUngrouped ||
                  deleteUngroupedConfirm !== deleteUngrouped.name
                }
                onClick={() => void handleDeleteUngrouped()}
                className="btn-danger"
              >
                {deletingUngrouped ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
