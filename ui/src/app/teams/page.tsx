"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, Team } from "@/lib/api";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = useCallback(() => {
    apiFetch<Team[]>("/teams/").then(setTeams);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditing(team);
    setForm({ name: team.name, description: team.description });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiFetch(`/teams/${editing.id}/`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch("/teams/", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this team?")) return;
    await apiFetch(`/teams/${id}/`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sanctum-mist">Teams</h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          <i className="fa-solid fa-circle-plus" aria-hidden />
          New Team
        </button>
      </div>

      <div className="sanctum-card overflow-hidden">
        <table className="min-w-full divide-y divide-sanctum-line/15">
          <thead className="bg-sanctum-ink/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Description
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sanctum-line/15">
            {teams.map((team) => (
              <tr key={team.id} className="hover:bg-white/[0.03]">
                <td className="px-6 py-4 font-medium">
                  <Link
                    href={`/teams/${team.id}`}
                    className="text-sanctum-accent hover:text-sanctum-mist"
                  >
                    {team.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sanctum-muted">
                  {team.member_count ?? 0}
                </td>
                <td className="px-6 py-4 text-sm text-sanctum-muted">
                  {team.description || "\u2014"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/teams/${team.id}`}
                      className="btn-ghost px-2 py-1.5 text-xs text-sanctum-accent"
                    >
                      Members
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(team)}
                      className="btn-ghost px-2 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                    <Tooltip label="Delete team">
                      <button
                        type="button"
                        onClick={() => handleDelete(team.id)}
                        className="icon-btn-danger"
                        aria-label="Delete team"
                      >
                        <i className="fa-solid fa-trash" aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sanctum-muted"
                >
                  No teams yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Team" : "New Team"}
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
              onClick={() => setModalOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {!editing && (
                <i className="fa-solid fa-circle-plus" aria-hidden />
              )}
              {editing ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
