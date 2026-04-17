"use client";

import { useEffect, useState, useCallback } from "react";
import {
  apiFetch,
  Member,
  patchMemberSSHKey,
  SSHKey,
  Team,
} from "@/lib/api";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [keyTarget, setKeyTarget] = useState<Member | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    team_ids: [] as number[],
  });
  const [keyForm, setKeyForm] = useState({ label: "", public_key: "" });
  const [keyMode, setKeyMode] = useState<"paste" | "generate">("paste");
  const [generatedKey, setGeneratedKey] = useState<{
    public_key: string;
    private_key: string;
    label: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [editKeyTarget, setEditKeyTarget] = useState<{
    member: Member;
    key: SSHKey;
  } | null>(null);
  const [editKeyForm, setEditKeyForm] = useState({ label: "", public_key: "" });
  const [editKeySaving, setEditKeySaving] = useState(false);
  const [editKeyError, setEditKeyError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Member[]>("/members/").then(setMembers);
    apiFetch<Team[]>("/teams/").then(setTeams);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", email: "", team_ids: [] });
    setModalOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      username: m.username,
      email: m.email,
      team_ids: m.teams.map((t) => t.id),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiFetch(`/members/${editing.id}/`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch("/members/", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    load();
  };

  const openDeleteModal = (m: Member) => {
    setDeleteTarget(m);
    setDeleteConfirmInput("");
    setDeleteOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!deleteTarget || deleteConfirmInput !== "DELETE") return;
    await apiFetch(`/members/${deleteTarget.id}/`, { method: "DELETE" });
    setDeleteOpen(false);
    setDeleteTarget(null);
    setDeleteConfirmInput("");
    load();
  };

  const handleRevokeAccess = async (m: Member) => {
    if (
      !confirm(
        `Revoke all access for ${m.username}? They will be removed from every team and marked revoked on every environment they could reach. Servers apply this on the next provision run.`
      )
    ) {
      return;
    }
    await apiFetch<Member>(`/members/${m.id}/revoke-access/`, { method: "POST" });
    load();
  };

  const handleRestoreAccess = async (m: Member) => {
    if (
      !confirm(
        `Restore ${m.username}? Direct environment assignments will be cleared; re-add access in Projects as needed.`
      )
    ) {
      return;
    }
    await apiFetch<Member>(`/members/${m.id}/restore-access/`, { method: "POST" });
    load();
  };

  const openAddKey = (m: Member) => {
    setKeyTarget(m);
    setKeyForm({ label: "", public_key: "" });
    setKeyMode("paste");
    setGeneratedKey(null);
    setGenerating(false);
    setAcknowledged(false);
    setKeyModalOpen(true);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyTarget) return;
    await apiFetch(`/members/${keyTarget.id}/keys/`, {
      method: "POST",
      body: JSON.stringify(keyForm),
    });
    setKeyModalOpen(false);
    load();
  };

  const handleGenerateKey = async () => {
    if (!keyTarget) return;
    setGenerating(true);
    try {
      const result = await apiFetch<{
        id: number;
        label: string;
        public_key: string;
        private_key: string;
      }>(`/members/${keyTarget.id}/generate-key/`, {
        method: "POST",
        body: JSON.stringify({ label: keyForm.label || "Generated key" }),
      });
      setGeneratedKey(result);
    } finally {
      setGenerating(false);
    }
  };

  const handleDoneWithGenerated = () => {
    setKeyModalOpen(false);
    setGeneratedKey(null);
    setAcknowledged(false);
    load();
  };

  const downloadPrivateKey = () => {
    if (!generatedKey) return;
    const blob = new Blob([generatedKey.private_key], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${keyTarget?.username || "sanctum"}_ed25519`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteKey = async (memberId: number, keyId: number) => {
    await apiFetch(`/members/${memberId}/keys/${keyId}/`, { method: "DELETE" });
    load();
  };

  const openEditKey = (member: Member, key: SSHKey) => {
    setEditKeyTarget({ member, key });
    setEditKeyForm({
      label: key.label || "",
      public_key: key.public_key,
    });
    setEditKeyError(null);
  };

  const handleSaveEditKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editKeyTarget) return;
    setEditKeySaving(true);
    setEditKeyError(null);
    try {
      await patchMemberSSHKey(editKeyTarget.member.id, editKeyTarget.key.id, {
        label: editKeyForm.label.trim(),
        public_key: editKeyForm.public_key.trim(),
      });
      setEditKeyTarget(null);
      load();
    } catch (err) {
      let msg = "Could not save changes. Please try again.";
      if (err instanceof Error && err.message) {
        try {
          const parsed = JSON.parse(err.message) as Record<string, unknown>;
          const first =
            (Array.isArray(parsed.label) && parsed.label[0]) ||
            (Array.isArray(parsed.public_key) && parsed.public_key[0]) ||
            (typeof parsed.detail === "string" ? parsed.detail : null);
          if (typeof first === "string") msg = first;
        } catch {
          if (err.message.length < 300) msg = err.message;
        }
      }
      setEditKeyError(msg);
    } finally {
      setEditKeySaving(false);
    }
  };

  const toggleTeam = (teamId: number) => {
    setForm((prev) => ({
      ...prev,
      team_ids: prev.team_ids.includes(teamId)
        ? prev.team_ids.filter((id) => id !== teamId)
        : [...prev.team_ids, teamId],
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sanctum-mist">Members</h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          <i className="fa-solid fa-circle-plus" aria-hidden />
          New Member
        </button>
      </div>

      <div className="space-y-4">
        {members.map((m) => (
          <div
            key={m.id}
            className={`sanctum-card p-5 ${
              m.access_revoked ? "border-danger/40 bg-danger/5" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-sanctum-mist">
                    {m.username}
                  </h3>
                  {m.access_revoked && (
                    <span className="inline-flex items-center rounded border border-danger/50 bg-danger/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-danger">
                      Access revoked
                    </span>
                  )}
                </div>
                <p className="text-sm text-sanctum-muted">
                  {m.email || "No email"}
                </p>
                {m.access_revoked ? (
                  <p className="mt-2 text-xs text-sanctum-muted">
                    Removed from all teams. Environments show under &quot;Globally
                    revoked&quot; on each project until servers converge.
                  </p>
                ) : m.teams.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.teams.map((t) => (
                      <span
                        key={t.id}
                        className="inline-block rounded-full border border-sanctum-line/25 bg-sanctum-ink/50 px-2 py-0.5 text-xs text-sanctum-muted"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1">
                {!m.access_revoked && (
                  <button
                    type="button"
                    onClick={() => handleRevokeAccess(m)}
                    className="btn-ghost px-2 py-1.5 text-xs text-warning"
                  >
                    <i className="fa-solid fa-ban mr-1" aria-hidden />
                    Revoke all access
                  </button>
                )}
                {m.access_revoked && (
                  <button
                    type="button"
                    onClick={() => handleRestoreAccess(m)}
                    className="btn-secondary px-2 py-1.5 text-xs"
                  >
                    Restore access
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openAddKey(m)}
                  disabled={m.access_revoked}
                  title={
                    m.access_revoked
                      ? "Restore access before adding keys"
                      : undefined
                  }
                  className="btn-ghost gap-1.5 px-2 py-1.5 text-sm text-success hover:text-sanctum-mist disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <i className="fa-solid fa-circle-plus" aria-hidden />
                  Key
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="btn-ghost px-2 py-1.5 text-sm text-sanctum-accent"
                >
                  Edit
                </button>
                <Tooltip label="Delete member record from Sanctum">
                  <button
                    type="button"
                    onClick={() => openDeleteModal(m)}
                    className="icon-btn-danger"
                    aria-label="Delete member"
                  >
                    <i className="fa-solid fa-trash" aria-hidden />
                  </button>
                </Tooltip>
              </div>
            </div>
            {m.ssh_keys.length > 0 && (
              <div className="mt-3 space-y-1">
                {m.ssh_keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between rounded border border-sanctum-line/15 bg-sanctum-ink/40 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sanctum-mist">
                        {k.label || "Unnamed key"}
                      </span>
                      <span className="ml-2 truncate text-sanctum-muted">
                        {k.public_key.substring(0, 50)}...
                      </span>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-0.5">
                      <Tooltip label="Edit label or public key">
                        <button
                          type="button"
                          onClick={() => openEditKey(m, k)}
                          className="rounded p-1.5 text-sanctum-muted transition-colors hover:bg-white/10 hover:text-sanctum-mist"
                          aria-label="Edit SSH key"
                        >
                          <i className="fa-solid fa-pen text-xs" aria-hidden />
                        </button>
                      </Tooltip>
                      <Tooltip label="Remove SSH key">
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(m.id, k.id)}
                          className="icon-btn-danger flex-shrink-0"
                          aria-label="Remove SSH key"
                        >
                          <i className="fa-solid fa-trash text-xs" aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <div className="py-12 text-center text-sanctum-muted">
            No members yet
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Member" : "New Member"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="sanctum-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="sanctum-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Teams
            </label>
            {editing?.access_revoked && (
              <p className="mb-2 text-sm text-warning">
                Access is globally revoked. Use <strong>Restore access</strong> on
                the member card before assigning teams.
              </p>
            )}
            <div
              className={`flex flex-wrap gap-2 ${
                editing?.access_revoked ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {teams.map((t) => (
                <label
                  key={t.id}
                  className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    form.team_ids.includes(t.id)
                      ? "border-sanctum-accent/50 bg-sanctum-accent/20 text-sanctum-mist"
                      : "border-sanctum-line/25 text-sanctum-muted hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.team_ids.includes(t.id)}
                    onChange={() => toggleTeam(t.id)}
                    className="sr-only"
                    disabled={!!editing?.access_revoked}
                  />
                  {t.name}
                </label>
              ))}
              {teams.length === 0 && (
                <span className="text-sm text-sanctum-muted">
                  No teams created yet
                </span>
              )}
            </div>
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

      <Modal
        open={keyModalOpen}
        onClose={() => {
          if (generatedKey && !acknowledged) return;
          const savedKey = generatedKey !== null;
          setKeyModalOpen(false);
          setGeneratedKey(null);
          setAcknowledged(false);
          if (savedKey) load();
        }}
        title={`Add SSH Key \u2014 ${keyTarget?.username ?? ""}`}
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-md border border-warning/40 bg-warning-surface p-4">
              <p className="mb-1 text-sm font-semibold text-warning">
                Save this private key now
              </p>
              <p className="text-sm text-sanctum-mist">
                This is the only time the private key will be shown. It is not
                stored by Sanctum and cannot be recovered. Transfer it to the
                user securely (e.g. USB drive, encrypted channel).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-sanctum-mist">
                Public Key (saved)
              </label>
              <div className="break-all rounded border border-sanctum-line/20 bg-sanctum-ink/60 px-3 py-2 font-mono text-xs text-sanctum-muted">
                {generatedKey.public_key}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-sanctum-mist">
                  Private Key
                </label>
                <button
                  type="button"
                  onClick={downloadPrivateKey}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-sanctum-accent hover:text-sanctum-mist"
                >
                  <i className="fa-solid fa-download" aria-hidden />
                  Download as file
                </button>
              </div>
              <textarea
                readOnly
                value={generatedKey.private_key}
                rows={8}
                className="sanctum-input border-danger/40 bg-danger-surface font-mono text-xs text-sanctum-mist selection:bg-danger/30"
                onFocus={(e) => e.target.select()}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-sanctum-line/40 bg-sanctum-surface2 text-sanctum-accent"
              />
              <span className="text-sm text-sanctum-muted">
                I have saved the private key and understand it cannot be
                retrieved after closing this dialog.
              </span>
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!acknowledged}
                onClick={handleDoneWithGenerated}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex overflow-hidden rounded-md border border-sanctum-line/25">
              <button
                type="button"
                onClick={() => setKeyMode("paste")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  keyMode === "paste"
                    ? "bg-sanctum-accent text-white"
                    : "bg-sanctum-surface2 text-sanctum-muted hover:bg-sanctum-surface"
                }`}
              >
                Paste existing key
              </button>
              <button
                type="button"
                onClick={() => setKeyMode("generate")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  keyMode === "generate"
                    ? "bg-sanctum-accent text-white"
                    : "bg-sanctum-surface2 text-sanctum-muted hover:bg-sanctum-surface"
                }`}
              >
                Generate new keypair
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-sanctum-mist">
                Label
              </label>
              <input
                type="text"
                value={keyForm.label}
                onChange={(e) =>
                  setKeyForm({ ...keyForm, label: e.target.value })
                }
                placeholder="e.g. Work laptop"
                className="sanctum-input"
              />
            </div>

            {keyMode === "paste" ? (
              <form onSubmit={handleAddKey} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-sanctum-mist">
                    Public Key
                  </label>
                  <textarea
                    value={keyForm.public_key}
                    onChange={(e) =>
                      setKeyForm({ ...keyForm, public_key: e.target.value })
                    }
                    required
                    rows={4}
                    placeholder="ssh-ed25519 AAAA... user@host"
                    className="sanctum-input font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setKeyModalOpen(false)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <i className="fa-solid fa-circle-plus" aria-hidden />
                    Add Key
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-sanctum-line/20 bg-sanctum-ink/50 p-3">
                  <p className="text-sm text-sanctum-muted">
                    An Ed25519 keypair will be generated. The public key is saved
                    to Sanctum. You will be shown the private key exactly once to
                    save and distribute to the user.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setKeyModalOpen(false)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    disabled={generating}
                    className="btn-primary disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "Generate Keypair"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={editKeyTarget !== null}
        onClose={() => {
          setEditKeyTarget(null);
          setEditKeyError(null);
        }}
        title={
          editKeyTarget
            ? `Edit SSH key — ${editKeyTarget.member.username}`
            : "Edit SSH key"
        }
      >
        <form onSubmit={(e) => void handleSaveEditKey(e)} className="space-y-4">
          {editKeyError && (
            <div
              role="alert"
              className="rounded-md border border-danger/40 bg-danger-surface px-3 py-2 text-sm text-danger"
            >
              {editKeyError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Label
            </label>
            <input
              type="text"
              value={editKeyForm.label}
              onChange={(e) =>
                setEditKeyForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="e.g. Laptop, CI deploy key"
              className="sanctum-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sanctum-mist">
              Public key
            </label>
            <textarea
              value={editKeyForm.public_key}
              onChange={(e) =>
                setEditKeyForm((f) => ({ ...f, public_key: e.target.value }))
              }
              rows={5}
              required
              className="sanctum-input font-mono text-xs"
            />
            <p className="mt-1 text-xs text-sanctum-muted">
              One line, OpenSSH format (e.g. ssh-ed25519, ssh-rsa, ecdsa-sha2-…).
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditKeyTarget(null)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editKeySaving}
              className="btn-primary"
            >
              {editKeySaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
          setDeleteConfirmInput("");
        }}
        title="Delete member from Sanctum"
      >
        <div className="space-y-4">
          <p className="text-sm text-sanctum-muted">
            This removes the user record, SSH keys, and team links from Sanctum
            only.{" "}
            <strong className="text-sanctum-mist">
              It does not lock accounts or remove keys on servers by itself
            </strong>
            — that happens when servers run the provision script built from
            current assignments. Use{" "}
            <strong className="text-sanctum-mist">Revoke all access</strong> or
            per-environment <strong className="text-sanctum-mist">Removed</strong>{" "}
            first if you need to revoke on machines.
          </p>
          <p className="text-sm text-danger">
            Type{" "}
            <span className="rounded bg-sanctum-ink px-1.5 py-0.5 font-mono text-sanctum-mist">
              DELETE
            </span>{" "}
            (all caps) to confirm.
          </p>
          <input
            type="text"
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value)}
            className="sanctum-input font-mono"
            placeholder="DELETE"
            autoComplete="off"
            aria-label="Type DELETE to confirm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
                setDeleteConfirmInput("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={deleteConfirmInput !== "DELETE"}
              onClick={confirmDeleteMember}
            >
              Delete member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
