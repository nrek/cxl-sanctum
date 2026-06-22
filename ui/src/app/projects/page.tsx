"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatusDot from "@/components/StatusDot";
import {
  apiFetch,
  createAccessRequest,
  getApiBase,
  Project,
  ProjectEnvironmentWorstStatus,
  ServerGroup,
} from "@/lib/api";
import ProvisionSnippets from "@/components/ProvisionSnippets";
import SupplementalGroupsEditor from "@/components/SupplementalGroupsEditor";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";
import ViewToggle from "@/components/ViewToggle";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isAdminRole } from "@/lib/roles";

function projectWorstStatusPresentation(
  status: ProjectEnvironmentWorstStatus | undefined
): { dotClass: string; label: string } {
  switch (status ?? "live") {
    case "dead":
      return {
        dotClass: "bg-danger",
        label: "At least one environment has dead servers",
      };
    case "stale":
      return {
        dotClass: "bg-warning",
        label: "At least one environment is stale; none are dead",
      };
    default:
      return {
        dotClass: "bg-success",
        label: "All environments with servers are online",
      };
  }
}

function ProjectTitleWithStatusDot({
  name,
  status,
}: {
  name: string;
  status?: ProjectEnvironmentWorstStatus;
}) {
  const { dotClass, label } = projectWorstStatusPresentation(status);
  return (
    <>
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`}
        title={label}
        role="img"
        aria-label={label}
      />
      <span className="min-w-0 truncate">{name}</span>
    </>
  );
}

export default function ProjectsPage() {
  const { workspace, refresh } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [ungrouped, setUngrouped] = useState<ServerGroup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", tags: [] as string[] });
  const [tagDraft, setTagDraft] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deleteUngrouped, setDeleteUngrouped] = useState<ServerGroup | null>(
    null
  );
  const [deleteUngroupedConfirm, setDeleteUngroupedConfirm] = useState("");
  const [deletingUngrouped, setDeletingUngrouped] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<"tiles" | "rows">(
    "sanctum_projects_view",
    "tiles"
  );

  const handleSaveUngroupedSupplementalGroups = async (
    groupId: number,
    supplemental_groups: string[]
  ) => {
    await apiFetch(`/server-groups/${groupId}/`, {
      method: "PATCH",
      body: JSON.stringify({ supplemental_groups }),
    });
    load();
  };

  const isAdmin = isAdminRole(workspace);

  const load = useCallback(() => {
    apiFetch<Project[]>("/projects/").then(setProjects);
    if (isAdmin) {
      apiFetch<ServerGroup[]>("/server-groups/?ungrouped=1").then(setUngrouped);
    } else {
      setUngrouped([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const apiBase =
    typeof window !== "undefined" ? getApiBase() : "";

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", tags: [] });
    setTagDraft("");
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      tags: p.tags ?? [],
    });
    setTagDraft("");
    setModalOpen(true);
  };

  const addTag = () => {
    const next = tagDraft
      .split(/[,\s]+/)
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    if (next.length === 0) return;
    setForm((prev) => {
      const tags = [...prev.tags];
      for (const tag of next) {
        if (!tags.includes(tag)) tags.push(tag);
      }
      return { ...prev, tags };
    });
    setTagDraft("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiFetch(`/projects/${editing.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description,
          tags: form.tags,
        }),
      });
    } else {
      await apiFetch("/projects/", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description,
          tags: form.tags,
        }),
      });
    }
    setModalOpen(false);
    setEditing(null);
    setForm({ name: "", description: "", tags: [] });
    load();
  };

  const handleRequestAccess = async (project: Project) => {
    setActionMessage(null);
    await createAccessRequest({
      kind: "access",
      project: project.id,
      role_requested: "user",
      note: `Requesting access to ${project.name}`,
    });
    setActionMessage(`Request sent for ${project.name}.`);
  };

  const handleAddMe = async (project: Project) => {
    setActionMessage(null);
    await apiFetch(`/projects/${project.id}/assign-self/`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    load();
    refresh();
    setActionMessage(`Added your member profile to ${project.name}.`);
  };

  const tags = Array.from(
    new Set(projects.flatMap((project) => project.tags ?? []))
  ).sort();
  const visibleProjects = projects.filter((project) => {
    const haystack = `${project.name} ${project.description} ${(project.tags ?? []).join(" ")}`.toLowerCase();
    const matchesSearch = search.trim()
      ? haystack.includes(search.trim().toLowerCase())
      : true;
    const matchesTag =
      tagFilter === "all" || (project.tags ?? []).includes(tagFilter);
    return matchesSearch && matchesTag;
  });

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
      <PageHeader
        title="Projects"
        subtitle="Environments grouped by client or product."
        actions={
          <div className="flex flex-wrap gap-2">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            {isAdmin ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <i className="fa-solid fa-circle-plus" aria-hidden />
                New Project
              </button>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects by name or tag..."
          className="sanctum-input max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {["all", ...tags].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={`rounded-full border px-3 py-1.5 font-mono text-xs ${
                tagFilter === tag
                  ? "border-sanctum-accent bg-sanctum-accent/10 text-sanctum-accent"
                  : "border-sanctum-line text-sanctum-muted hover:text-sanctum-mist"
              }`}
            >
              {tag === "all" ? "All" : tag}
            </button>
          ))}
        </div>
      </div>

      {actionMessage ? (
        <div className="mb-5 rounded-lg border border-sanctum-line bg-sanctum-raised px-4 py-3 text-sm text-sanctum-mist">
          {actionMessage}
        </div>
      ) : null}

      {viewMode === "tiles" ? (
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((p) => (
            <div key={p.id} className="sanctum-card relative p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link
                  href={`/projects/${p.id}`}
                  className="flex min-w-0 items-center gap-2 text-lg font-semibold text-sanctum-project hover:text-sanctum-accent"
                >
                  <ProjectTitleWithStatusDot
                    name={p.name}
                    status={p.environment_worst_status}
                  />
                </Link>
                {isAdmin ? (
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
                ) : null}
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-sanctum-muted">
                {p.description || "No description"}
              </p>
              {(p.tags ?? []).length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {(p.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-sanctum-line bg-sanctum-bg px-2 py-0.5 font-mono text-[10px] text-sanctum-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-4 text-sm text-sanctum-muted">
                <span>{p.environment_count ?? 0} environments</span>
                <span>{p.access_row_count ?? 0} access rows</span>
              </div>
              <div className="mt-4">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => void handleAddMe(p)}
                    className="btn-secondary text-xs"
                  >
                    + Add me
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRequestAccess(p)}
                    className="btn-secondary text-xs"
                  >
                    Request access →
                  </button>
                )}
              </div>
            </div>
          ))}
          {visibleProjects.length === 0 && (
            <p className="col-span-full py-8 text-center text-sanctum-muted">
              No projects yet. Create one to group Development, Staging, and
              Production servers.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-10 space-y-1">
          {visibleProjects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-lg border border-sanctum-line/20 bg-sanctum-surface px-4 py-3 shadow-sm"
            >
              <Link
                href={`/projects/${p.id}`}
                className="flex min-w-0 shrink-0 items-center gap-2 text-sm font-semibold text-sanctum-mist hover:text-sanctum-accent"
                style={{ width: "clamp(8rem, 20%, 14rem)" }}
              >
                <ProjectTitleWithStatusDot
                  name={p.name}
                  status={p.environment_worst_status}
                />
              </Link>
              <p className="min-w-0 flex-1 truncate text-sm text-sanctum-muted">
                {p.description || "No description"}
              </p>
              <div className="hidden min-w-0 flex-1 flex-wrap gap-1 lg:flex">
                {(p.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-sanctum-line bg-sanctum-bg px-2 py-0.5 font-mono text-[10px] text-sanctum-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="shrink-0 text-xs text-sanctum-muted whitespace-nowrap">
                {p.environment_count ?? 0} env
              </span>
              <span className="shrink-0 text-xs text-sanctum-muted whitespace-nowrap">
                {p.access_row_count ?? 0} access
              </span>
              {isAdmin ? (
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
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => void handleAddMe(p)}
                  className="btn-secondary text-xs"
                >
                  + Add me
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRequestAccess(p)}
                  className="btn-secondary text-xs"
                >
                  Request access →
                </button>
              )}
            </div>
          ))}
          {visibleProjects.length === 0 && (
            <p className="py-8 text-center text-sanctum-muted">
              No projects yet. Create one to group Development, Staging, and
              Production servers.
            </p>
          )}
        </div>
      )}

      {isAdmin && ungrouped.length > 0 && (
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
                <SupplementalGroupsEditor
                  id={`ungrouped-supplemental-${g.id}`}
                  groups={g.supplemental_groups ?? []}
                  onChange={(groups) =>
                    void handleSaveUngroupedSupplementalGroups(g.id, groups)
                  }
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
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Tags
            </label>
            <p className="mb-2 text-xs text-sanctum-muted">
              Used to group and filter projects on the Projects page.
            </p>
            {form.tags.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-sanctum-line bg-sanctum-bg px-3 py-1 font-mono text-xs text-sanctum-mist"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          tags: prev.tags.filter((existing) => existing !== tag),
                        }))
                      }
                      className="text-sanctum-muted hover:text-danger"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="client, web, edge"
                className="sanctum-input"
              />
              <button type="button" onClick={addTag} className="btn-secondary">
                Add tag
              </button>
            </div>
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
