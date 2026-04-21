"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, TeamDetail, Member } from "@/lib/api";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";

export default function TeamDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [addMemberId, setAddMemberId] = useState<number | "">("");
  const [adding, setAdding] = useState(false);

  const loadTeam = useCallback(() => {
    apiFetch<TeamDetail>(`/teams/${id}/`).then(setTeam);
  }, [id]);

  const loadMembers = useCallback(() => {
    apiFetch<Member[]>("/members/").then(setAllMembers);
  }, []);

  useEffect(() => {
    loadTeam();
    loadMembers();
  }, [loadTeam, loadMembers]);

  const memberIdsInTeam = useMemo(
    () => new Set(team?.members.map((m) => m.id) ?? []),
    [team]
  );

  const availableToAdd = useMemo(
    () =>
      allMembers.filter(
        (m) => !memberIdsInTeam.has(m.id) && !m.access_revoked
      ),
    [allMembers, memberIdsInTeam]
  );

  const openEdit = () => {
    if (!team) return;
    setForm({ name: team.name, description: team.description });
    setEditOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    await apiFetch(`/teams/${team.id}/`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    setEditOpen(false);
    loadTeam();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || addMemberId === "") return;
    setAdding(true);
    try {
      const updated = await apiFetch<TeamDetail>(`/teams/${team.id}/members/`, {
        method: "POST",
        body: JSON.stringify({ member: addMemberId }),
      });
      setTeam(updated);
      setAddMemberId("");
      loadMembers();
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: number, username: string) => {
    if (!team) return;
    if (!confirm(`Remove ${username} from this team?`)) return;
    await apiFetch(`/teams/${team.id}/members/${memberId}/`, {
      method: "DELETE",
    });
    loadTeam();
    loadMembers();
  };

  if (!team) {
    return <div className="p-4 sm:p-6 lg:p-8 text-sanctum-muted">Loading...</div>;
  }

  return (
    <div className="max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/teams" className="link-accent text-sm">
          &larr; Teams
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-sanctum-mist">{team.name}</h1>
          <p className="text-sm text-sanctum-muted">
            {team.description || "No description"}
          </p>
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="btn-secondary text-sm"
        >
          Edit team
        </button>
      </div>

      <p className="mb-6 text-sm text-sanctum-muted">
        Users in this group inherit access from team assignments on{" "}
        <Link href="/projects" className="link-accent">
          Projects
        </Link>
        . Manage SSH keys per user on the{" "}
        <Link href="/members" className="link-accent">
          Members
        </Link>{" "}
        page.
      </p>

      <div className="sanctum-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sanctum-line/15 px-6 py-4">
          <h2 className="text-lg font-semibold text-sanctum-mist">Members</h2>
          <span className="text-sm text-sanctum-muted">
            {team.members.length} user{team.members.length === 1 ? "" : "s"}
          </span>
        </div>

        <form
          onSubmit={handleAddMember}
          className="flex flex-wrap items-end gap-3 border-b border-sanctum-line/15 bg-sanctum-ink/40 px-6 py-4"
        >
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-sanctum-muted">
              Add user to team
            </label>
            <select
              value={addMemberId}
              onChange={(e) =>
                setAddMemberId(e.target.value ? Number(e.target.value) : "")
              }
              className="sanctum-input"
              disabled={availableToAdd.length === 0}
            >
              <option value="">
                {availableToAdd.length === 0
                  ? "All members are already in this team"
                  : "Select a user..."}
              </option>
              {availableToAdd.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.username}
                  {m.email ? ` (${m.email})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={addMemberId === "" || adding}
            className="btn-primary disabled:opacity-50"
          >
            <i className="fa-solid fa-circle-plus" aria-hidden />
            {adding ? "Adding..." : "Add"}
          </button>
        </form>

        <div className="overflow-x-auto">
        <table className="w-full divide-y divide-sanctum-line/15 table-fixed">
          <colgroup>
            <col className="w-[35%]" />
            <col />
            <col className="w-16" />
          </colgroup>
          <thead className="bg-sanctum-ink/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Email
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sanctum-line/15">
            {team.members.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-4 font-medium">
                  <Link href="/members" className="link-accent">
                    {m.username}
                  </Link>
                </td>
                <td className="truncate px-4 py-4 text-sm text-sanctum-muted">
                  {m.email || "—"}
                </td>
                <td className="px-4 py-4 text-right">
                  <Tooltip label="Remove user from this team">
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id, m.username)}
                      className="icon-btn text-sanctum-muted hover:text-warning"
                      aria-label="Remove user from team"
                    >
                      <i className="fa-solid fa-user-minus" aria-hidden />
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
            {team.members.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-sm text-sanctum-muted"
                >
                  No users in this team yet. Add one above, or assign teams when
                  editing a member on the Members page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit team"
      >
        <form onSubmit={handleSaveTeam} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
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
              onClick={() => setEditOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
