"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  getApiBase,
  Project,
  Team,
  Member,
  Server,
  ProjectAccessResponse,
  ProjectAccessCell,
} from "@/lib/api";
import ProvisionSnippets from "@/components/ProvisionSnippets";
import ServerInventory from "@/components/ServerInventory";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";

type RoleOpt = "" | "user" | "sudo" | "removed";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [access, setAccess] = useState<ProjectAccessResponse | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [addEnvOpen, setAddEnvOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMemberOpen, setBulkMemberOpen] = useState(false);
  const [bulkTeamId, setBulkTeamId] = useState<number | "">("");
  const [bulkMemberId, setBulkMemberId] = useState<number | "">("");
  const [bulkRole, setBulkRole] = useState<RoleOpt>("user");
  const [setupDev, setSetupDev] = useState(true);
  const [setupStaging, setSetupStaging] = useState(true);
  const [setupProd, setSetupProd] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [deleteEnvTarget, setDeleteEnvTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteEnvConfirm, setDeleteEnvConfirm] = useState("");
  const [deletingEnv, setDeletingEnv] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [expandedEnvs, setExpandedEnvs] = useState<Set<number>>(new Set());

  const toggleEnv = (envId: number) => {
    setExpandedEnvs((prev) => {
      const next = new Set(prev);
      if (next.has(envId)) next.delete(envId);
      else next.add(envId);
      return next;
    });
  };

  const apiBase =
    typeof window !== "undefined" ? getApiBase() : "";

  const loadProject = useCallback(() => {
    apiFetch<Project>(`/projects/${id}/`).then(setProject);
  }, [id]);

  const loadAccess = useCallback(() => {
    apiFetch<ProjectAccessResponse>(`/projects/${id}/access/`).then(setAccess);
  }, [id]);

  const loadTeams = useCallback(() => {
    apiFetch<Team[]>("/teams/").then(setTeams);
  }, []);

  const loadMembers = useCallback(() => {
    apiFetch<Member[]>("/members/").then(setMembers);
  }, []);

  const loadServers = useCallback(() => {
    apiFetch<Server[]>("/servers/").then(setServers);
  }, []);

  useEffect(() => {
    loadProject();
    loadAccess();
    loadTeams();
    loadMembers();
    loadServers();
  }, [loadProject, loadAccess, loadTeams, loadMembers, loadServers]);

  const envIds = access?.environments.map((e) => e.id) ?? [];
  const serversInProject = servers.filter((s) =>
    envIds.includes(s.server_group)
  );

  const serverCountForGroup = (gid: number) =>
    serversInProject.filter((s) => s.server_group === gid).length;

  const serversForGroup = (gid: number) =>
    serversInProject.filter((s) => s.server_group === gid);

  const envStatusDot = (
    gid: number
  ): { cls: string; label: string } => {
    const list = serversForGroup(gid);
    if (list.length === 0)
      return {
        cls: "bg-sanctum-line/50",
        label: "No servers reporting yet",
      };
    if (list.every((s) => s.status === "online"))
      return { cls: "bg-success", label: "All servers online" };
    return {
      cls: "bg-warning",
      label: "One or more servers are stale or dead",
    };
  };

  const activeMembers = useMemo(
    () => members.filter((m) => !m.access_revoked),
    [members]
  );

  const handleAddEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    await apiFetch("/server-groups/", {
      method: "POST",
      body: JSON.stringify({
        name: newEnvName.trim(),
        project: Number(id),
        description: "",
      }),
    });
    setNewEnvName("");
    setAddEnvOpen(false);
    loadProject();
    loadAccess();
    loadServers();
  };

  const handleSetupPresets = async () => {
    setSettingUp(true);
    try {
      await apiFetch(`/projects/${id}/setup-environments/`, {
        method: "POST",
        body: JSON.stringify({
          development: setupDev,
          staging: setupStaging,
          production: setupProd,
        }),
      });
      loadProject();
      loadAccess();
      loadServers();
    } finally {
      setSettingUp(false);
    }
  };

  const handleBulkAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkTeamId === "") return;
    await apiFetch(`/projects/${id}/assign-team/`, {
      method: "POST",
      body: JSON.stringify({ team: bulkTeamId, role: bulkRole || "user" }),
    });
    setBulkOpen(false);
    setBulkTeamId("");
    loadProject();
    loadAccess();
  };

  const handleBulkAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkMemberId === "") return;
    await apiFetch(`/projects/${id}/assign-member/`, {
      method: "POST",
      body: JSON.stringify({ member: bulkMemberId, role: bulkRole || "user" }),
    });
    setBulkMemberOpen(false);
    setBulkMemberId("");
    loadProject();
    loadAccess();
  };

  const handleCellChange = async (
    kind: "team" | "member",
    principalId: number,
    serverGroupId: number,
    assignmentId: number | null,
    newRole: RoleOpt
  ) => {
    const bodyTeam =
      kind === "team"
        ? { team: principalId, member: null }
        : { team: null, member: principalId };
    if (newRole === "") {
      if (assignmentId != null) {
        await apiFetch(`/assignments/${assignmentId}/`, { method: "DELETE" });
      }
    } else if (assignmentId != null) {
      await apiFetch(`/assignments/${assignmentId}/`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
    } else {
      await apiFetch("/assignments/", {
        method: "POST",
        body: JSON.stringify({
          ...bodyTeam,
          server_group: serverGroupId,
          role: newRole,
        }),
      });
    }
    loadProject();
    loadAccess();
  };

  const renderCellRow = (
    label: string,
    rowKey: string,
    cells: ProjectAccessCell[],
    kind: "team" | "member",
    principalId: number,
    globallyRevoked = false
  ) => (
    <tr
      key={rowKey}
      className={`border-b border-sanctum-line/15 ${
        globallyRevoked ? "bg-danger/10" : ""
      }`}
    >
      <td className="py-2 pr-4">
        <span className="font-medium text-sanctum-mist">{label}</span>
        {globallyRevoked ? (
          <span className="ml-2 inline-flex items-center rounded border border-danger/45 bg-danger/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
            Globally revoked
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-sanctum-muted">
            ({kind === "team" ? "group" : "user"})
          </span>
        )}
      </td>
      {cells.map((cell) => (
        <td key={cell.server_group_id} className="px-1 py-2 text-center">
          <select
            value={cell.role ?? ""}
            disabled={globallyRevoked}
            title={
              globallyRevoked
                ? "Restore access on the Members page before changing roles here."
                : undefined
            }
            onChange={(e) =>
              handleCellChange(
                kind,
                principalId,
                cell.server_group_id,
                cell.assignment_id,
                e.target.value as RoleOpt
              )
            }
            className={`sanctum-select max-w-full text-xs ${
              globallyRevoked ? "cursor-not-allowed opacity-90" : ""
            } ${
              !globallyRevoked && cell.role === "removed"
                ? "border-warning/50 text-warning"
                : ""
            } ${globallyRevoked ? "border-danger/35" : ""}`}
          >
            <option value="">None</option>
            <option value="user">User</option>
            <option value="sudo">Sudo</option>
            <option value="removed">Removed / revoked</option>
          </select>
        </td>
      ))}
    </tr>
  );

  const handleRegenerateToken = async (sgId: number) => {
    await apiFetch(`/server-groups/${sgId}/regenerate-token/`, {
      method: "POST",
    });
    loadAccess();
  };

  const openDeleteEnvironment = (env: { id: number; name: string }) => {
    setDeleteEnvConfirm("");
    setDeleteEnvTarget(env);
  };

  const handleDeleteEnvironment = async () => {
    if (!deleteEnvTarget || deleteEnvConfirm !== deleteEnvTarget.name) return;
    setDeletingEnv(true);
    try {
      await apiFetch(`/server-groups/${deleteEnvTarget.id}/`, {
        method: "DELETE",
      });
      setDeleteEnvTarget(null);
      setDeleteEnvConfirm("");
      loadProject();
      loadAccess();
      loadServers();
    } finally {
      setDeletingEnv(false);
    }
  };

  const openEditProject = () => {
    if (!project) return;
    setEditForm({
      name: project.name,
      description: project.description ?? "",
    });
    setEditProjectOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch(`/projects/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name.trim(),
        description: editForm.description,
      }),
    });
    setEditProjectOpen(false);
    loadProject();
  };

  if (!project || !access) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-sanctum-muted">Loading...</div>
    );
  }

  const hasEnvs = access.environments.length > 0;
  const revokedRows = access.revoked_member_rows ?? [];
  const hasAnyRows =
    access.team_rows.length > 0 ||
    access.member_rows.length > 0 ||
    revokedRows.length > 0;

  return (
    <div className="max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/projects" className="link-accent text-sm">
          &larr; Projects
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mb-2 text-2xl font-bold text-sanctum-mist">
            {project.name}
          </h1>
          <p className="text-sanctum-muted">
            {project.description || (
              <span className="italic text-sanctum-muted/80">No description</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openEditProject}
          className="btn-secondary shrink-0 text-sm"
        >
          <i className="fa-solid fa-pen mr-1.5" aria-hidden />
          Edit project
        </button>
      </div>
      <p className="mb-6 text-sm text-sanctum-muted">
        Assign <strong className="text-sanctum-mist">teams</strong> (groups of
        users) or <strong className="text-sanctum-mist">users</strong>{" "}
        (individual accounts) to each environment.{" "}
        <strong className="text-sanctum-mist">Removed</strong> in a cell
        revokes that user for that environment only (servers pick it up on the
        next provision run). Changing{" "}
        <strong className="text-sanctum-mist">User</strong> ↔{" "}
        <strong className="text-sanctum-mist">Sudo</strong> only changes role on
        the server. Global revocation is done from the Members page.
      </p>

      {!hasEnvs && (
        <div className="mb-8 rounded-lg border border-warning/35 bg-warning-surface p-6">
          <h2 className="mb-2 text-lg font-semibold text-warning">
            Add environments
          </h2>
          <p className="mb-4 text-sm text-sanctum-mist">
            Create common environment names in one step, or add a custom name
            below after.
          </p>
          <div className="mb-4 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-sanctum-mist">
              <input
                type="checkbox"
                checked={setupDev}
                onChange={(e) => setSetupDev(e.target.checked)}
                className="rounded border-sanctum-line/40 bg-sanctum-surface2 text-sanctum-accent focus:ring-sanctum-accent"
              />
              Development
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-sanctum-mist">
              <input
                type="checkbox"
                checked={setupStaging}
                onChange={(e) => setSetupStaging(e.target.checked)}
                className="rounded border-sanctum-line/40 bg-sanctum-surface2 text-sanctum-accent focus:ring-sanctum-accent"
              />
              Staging
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-sanctum-mist">
              <input
                type="checkbox"
                checked={setupProd}
                onChange={(e) => setSetupProd(e.target.checked)}
                className="rounded border-sanctum-line/40 bg-sanctum-surface2 text-sanctum-accent focus:ring-sanctum-accent"
              />
              Production
            </label>
          </div>
          <button
            type="button"
            disabled={settingUp || (!setupDev && !setupStaging && !setupProd)}
            onClick={handleSetupPresets}
            className="btn-secondary border-warning/40 text-sanctum-mist hover:bg-warning/10"
          >
            {settingUp ? "Creating..." : "Create selected environments"}
          </button>
        </div>
      )}

      <div className="sanctum-card mb-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sanctum-mist">
            Environments
          </h2>
          <button
            type="button"
            onClick={() => setAddEnvOpen(true)}
            className="btn-ghost gap-1.5 text-sanctum-accent hover:text-sanctum-mist"
          >
            <i className="fa-solid fa-circle-plus" aria-hidden />
            Add environment
          </button>
        </div>

        {!hasEnvs ? (
          <p className="text-sm text-sanctum-muted">No environments yet.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-sanctum-muted">
              Use each environment&apos;s commands only on servers that belong to
              that environment.{" "}
              <strong className="font-medium text-sanctum-mist">
                Online
              </strong>{" "}
              in the dashboard means a heartbeat within about 10 minutes. If
              HTTPS to the API&apos;s public IP times out from inside the same
              VPC (hairpin), map the API hostname to its private IP in{" "}
              <code className="rounded bg-sanctum-line/15 px-1 text-sanctum-mist">
                /etc/hosts
              </code>
              .
            </p>
            {access.environments.map((env) => {
              const cnt = serverCountForGroup(env.id);
              const dot = envStatusDot(env.id);
              const expanded = expandedEnvs.has(env.id);
              return (
                <div
                  key={env.id}
                  className="overflow-hidden rounded-lg border border-sanctum-line/20 bg-sanctum-ink/50"
                >
                  <button
                    type="button"
                    onClick={() => toggleEnv(env.id)}
                    aria-expanded={expanded}
                    aria-controls={`env-body-${env.id}`}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sanctum-ink/70"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot.cls}`}
                        title={dot.label}
                        aria-hidden
                      />
                      <span className="truncate font-medium text-sanctum-mist">
                        {env.name}
                      </span>
                      <span className="sr-only">{dot.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-sm text-sanctum-muted">
                      <span className="tabular-nums">
                        {cnt} server{cnt === 1 ? "" : "s"}
                      </span>
                      <i
                        className={`fa-solid text-xs ${
                          expanded ? "fa-chevron-up" : "fa-chevron-down"
                        }`}
                        aria-hidden
                      />
                    </span>
                  </button>
                  {expanded && (
                    <div
                      id={`env-body-${env.id}`}
                      className="space-y-3 border-t border-sanctum-line/15 px-4 py-4"
                    >
                      <ProvisionSnippets
                        apiBase={apiBase}
                        token={env.provision_token}
                      />
                      <ServerInventory
                        servers={serversForGroup(env.id)}
                        environmentId={env.id}
                        environmentName={env.name}
                        onChange={loadServers}
                      />
                      <div className="flex items-center gap-1">
                        <Tooltip label="Regenerate provision token (invalidates old curl URL)">
                          <button
                            type="button"
                            onClick={() => handleRegenerateToken(env.id)}
                            className="icon-btn text-warning hover:text-warning-dim"
                            aria-label="Regenerate provision token"
                          >
                            <i
                              className="fa-solid fa-arrows-rotate"
                              aria-hidden
                            />
                          </button>
                        </Tooltip>
                        <Tooltip label="Remove this environment (assignments and server records are deleted)">
                          <button
                            type="button"
                            onClick={() => openDeleteEnvironment(env)}
                            className="icon-btn-danger"
                            aria-label={`Remove environment ${env.name}`}
                          >
                            <i className="fa-solid fa-trash" aria-hidden />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasEnvs && (
        <div className="sanctum-card mb-8 p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-sanctum-mist">
              Access by environment
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="btn-primary text-sm"
              >
                <i className="fa-solid fa-users" aria-hidden />
                Assign team (all envs)
              </button>
              <button
                type="button"
                onClick={() => setBulkMemberOpen(true)}
                className="btn-secondary text-sm"
              >
                <i className="fa-solid fa-user-plus" aria-hidden />
                Assign user (all envs)
              </button>
            </div>
          </div>
          <p className="mb-4 text-sm text-sanctum-muted">
            <strong className="text-sanctum-mist">Team</strong> = group of users
            (e.g. Production Deployments).
            <strong className="ml-2 text-sanctum-mist">User</strong> = a single
            account. Manage users and keys under Members; add users to teams
            there as needed. Orange-highlighted cells are{" "}
            <strong className="text-warning">environment-only revoked</strong>.
            The section below lists{" "}
            <strong className="text-danger">globally revoked</strong> users.
          </p>

          <form
            className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-sanctum-line/15 bg-sanctum-ink/40 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const kind = fd.get("grant_kind") as string;
              const sg = fd.get("grant_sg");
              const role = fd.get("grant_role") as string;
              if (!kind || !sg || !role) return;
              if (kind === "team") {
                const team = fd.get("grant_team");
                if (!team) return;
                await apiFetch("/assignments/", {
                  method: "POST",
                  body: JSON.stringify({
                    team: Number(team),
                    member: null,
                    server_group: Number(sg),
                    role,
                  }),
                });
              } else {
                const member = fd.get("grant_member");
                if (!member) return;
                await apiFetch("/assignments/", {
                  method: "POST",
                  body: JSON.stringify({
                    team: null,
                    member: Number(member),
                    server_group: Number(sg),
                    role,
                  }),
                });
              }
              (e.target as HTMLFormElement).reset();
              loadProject();
              loadAccess();
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-sanctum-muted">
                Grant one cell
              </label>
              <select
                name="grant_kind"
                required
                defaultValue="team"
                className="sanctum-select"
              >
                <option value="team">Team (group)</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <select
                name="grant_team"
                className="sanctum-select min-w-[8rem]"
              >
                <option value="">Team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="grant_member"
                className="sanctum-select min-w-[8rem]"
              >
                <option value="">User...</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="grant_sg"
                required
                className="sanctum-select min-w-[8rem]"
              >
                <option value="">Environment</option>
                {access.environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="grant_role"
                required
                defaultValue="user"
                className="sanctum-select"
              >
                <option value="user">User</option>
                <option value="sudo">Sudo</option>
                <option value="removed">Removed</option>
              </select>
            </div>
            <button type="submit" className="btn-secondary text-sm">
              <i className="fa-solid fa-circle-plus" aria-hidden />
              Add
            </button>
          </form>
          <p className="mb-4 text-xs text-sanctum-muted">
            For &quot;Grant one cell&quot;, pick Team or User in the first
            dropdown, then fill the matching Team or User field (ignore the
            other).
          </p>

          {!hasAnyRows ? (
            <p className="text-sm text-sanctum-muted">
              No assignments yet. Use bulk actions or the form above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-sanctum-line/25">
                    <th className="py-2 pr-4 text-left text-sanctum-muted">
                      Team or user
                    </th>
                    {access.environments.map((env) => (
                      <th
                        key={env.id}
                        className="min-w-[7rem] px-1 py-2 text-center text-sanctum-muted"
                      >
                        {env.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {access.team_rows.map((row) =>
                    renderCellRow(
                      row.team.name,
                      `team-${row.team.id}`,
                      row.cells,
                      "team",
                      row.team.id
                    )
                  )}
                  {access.member_rows.map((row) =>
                    renderCellRow(
                      row.member.username,
                      `member-${row.member.id}`,
                      row.cells,
                      "member",
                      row.member.id,
                      false
                    )
                  )}
                </tbody>
              </table>
              {revokedRows.length > 0 && (
                <div className="mt-6 border-t border-danger/25 pt-4">
                  <h3 className="mb-1 text-sm font-semibold text-danger">
                    Globally revoked users
                  </h3>
                  <p className="mb-3 text-xs text-sanctum-muted">
                    Removed from all teams in Sanctum; direct assignments set to
                    revoked so servers can lock accounts on the next provision
                    run. Restore access from the Members page to assign again.
                  </p>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-danger/25">
                        <th className="py-2 pr-4 text-left text-sanctum-muted">
                          User
                        </th>
                        {access.environments.map((env) => (
                          <th
                            key={env.id}
                            className="min-w-[7rem] px-1 py-2 text-center text-sanctum-muted"
                          >
                            {env.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {revokedRows.map((row) =>
                        renderCellRow(
                          row.member.username,
                          `revoked-member-${row.member.id}`,
                          row.cells,
                          "member",
                          row.member.id,
                          true
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        title="Edit project"
      >
        <form onSubmit={(e) => void handleSaveProject(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
              required
              className="sanctum-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              className="sanctum-input min-h-[6rem]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditProjectOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-check mr-1.5" aria-hidden />
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={addEnvOpen} onClose={() => setAddEnvOpen(false)} title="Add environment">
        <form onSubmit={handleAddEnvironment} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Name
            </label>
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              required
              placeholder="e.g. QA"
              className="sanctum-input"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddEnvOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-circle-plus" aria-hidden />
              Add
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Assign team to all environments">
        <form onSubmit={handleBulkAssignTeam} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Team (group)
            </label>
            <select
              value={bulkTeamId}
              onChange={(e) =>
                setBulkTeamId(e.target.value ? Number(e.target.value) : "")
              }
              required
              className="sanctum-input"
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Role on every environment
            </label>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as RoleOpt)}
              className="sanctum-input"
            >
              <option value="user">User</option>
              <option value="sudo">Sudo</option>
              <option value="removed">Removed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Apply
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={bulkMemberOpen}
        onClose={() => setBulkMemberOpen(false)}
        title="Assign user to all environments"
      >
        <form onSubmit={handleBulkAssignMember} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              User (member)
            </label>
            <select
              value={bulkMemberId}
              onChange={(e) =>
                setBulkMemberId(e.target.value ? Number(e.target.value) : "")
              }
              required
              className="sanctum-input"
            >
              <option value="">Select user</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Role on every environment
            </label>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as RoleOpt)}
              className="sanctum-input"
            >
              <option value="user">User</option>
              <option value="sudo">Sudo</option>
              <option value="removed">Removed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBulkMemberOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-secondary">
              Apply
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteEnvTarget !== null}
        onClose={() => {
          setDeleteEnvTarget(null);
          setDeleteEnvConfirm("");
        }}
        title="Remove environment"
      >
        {deleteEnvTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-sanctum-muted">
              This removes the environment{" "}
              <strong className="text-sanctum-mist">{deleteEnvTarget.name}</strong>{" "}
              from this project. All{" "}
              <strong className="text-sanctum-mist">access assignments</strong> for
              it and any <strong className="text-sanctum-mist">registered servers</strong>{" "}
              in SANCTUM are deleted. Servers that still run old provision scripts will
              no longer match this group.
            </p>
            <p className="text-sm text-sanctum-muted">
              Type the environment name{" "}
              <code className="rounded bg-sanctum-ink px-1 py-0.5 text-sanctum-mist">
                {deleteEnvTarget.name}
              </code>{" "}
              to confirm.
            </p>
            <input
              type="text"
              value={deleteEnvConfirm}
              onChange={(e) => setDeleteEnvConfirm(e.target.value)}
              placeholder={deleteEnvTarget.name}
              className="sanctum-input"
              autoComplete="off"
              aria-label="Type environment name to confirm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteEnvTarget(null);
                  setDeleteEnvConfirm("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deletingEnv || deleteEnvConfirm !== deleteEnvTarget.name
                }
                onClick={() => void handleDeleteEnvironment()}
                className="btn-danger"
              >
                {deletingEnv ? "Removing…" : "Remove environment"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
