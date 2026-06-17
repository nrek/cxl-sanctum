"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, Team } from "@/lib/api";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import MemberAvatar from "@/components/MemberAvatar";

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
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Teams"
        subtitle="Groups of members you assign together."
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            <i className="fa-solid fa-circle-plus" aria-hidden />
            New Team
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div key={team.id} className="sanctum-card p-5">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-sanctum-mist">
                  {team.name}
                </h2>
                <p className="font-mono text-[11px] text-sanctum-muted">
                  {team.member_count ?? 0} members
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(team)}
                  className="icon-btn"
                  aria-label="Edit team"
                >
                  <i className="fa-solid fa-pen" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(team.id)}
                  className="icon-btn-danger"
                  aria-label="Delete team"
                >
                  <i className="fa-solid fa-trash" aria-hidden />
                </button>
              </div>
            </div>
            {team.description ? (
              <p className="mb-4 line-clamp-2 text-sm text-sanctum-muted">
                {team.description}
              </p>
            ) : null}
            <div className="mb-4 flex -space-x-2">
              <MemberAvatar name={team.name} username={team.name} size="sm" />
            </div>
            <Link
              href={`/teams/${team.id}`}
              className="text-sm font-semibold text-sanctum-accent hover:text-sanctum-mist"
            >
              Manage team →
            </Link>
          </div>
        ))}
        {teams.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sanctum-muted">
            No teams yet
          </p>
        ) : null}
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
