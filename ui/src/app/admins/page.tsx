"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  WorkspaceAdminEntry,
  createWorkspaceAdmin,
  deleteWorkspaceAdmin,
  fetchWorkspaceAdmins,
  patchWorkspaceAdmin,
  resetWorkspaceAdminPassword,
} from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import Modal from "@/components/Modal";

export default function AdminsPage() {
  const { workspace, loading: wsLoading } = useWorkspace();
  const [admins, setAdmins] = useState<WorkspaceAdminEntry[]>([]);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<WorkspaceAdminEntry | null>(null);
  const [pwdForm, setPwdForm] = useState({ new_password: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<WorkspaceAdminEntry | null>(
    null
  );
  const [emailValue, setEmailValue] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  const load = useCallback(() => {
    setLoadError("");
    fetchWorkspaceAdmins()
      .then(setAdmins)
      .catch(() => {
        setLoadError("Could not load workspace admins.");
        setAdmins([]);
      });
  }, []);

  useEffect(() => {
    if (!wsLoading && (workspace?.role ?? "owner") === "owner") {
      load();
    }
  }, [wsLoading, workspace?.role, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await createWorkspaceAdmin({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
      });
      setForm({ username: "", password: "", email: "" });
      load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as Error).message)
          : "Could not create admin.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: WorkspaceAdminEntry) => {
    if (
      !confirm(
        `Remove workspace admin "${a.username}"? Their login will be deleted.`
      )
    ) {
      return;
    }
    await deleteWorkspaceAdmin(a.id);
    load();
  };

  const openEmail = (a: WorkspaceAdminEntry) => {
    setEmailTarget(a);
    setEmailValue(a.email || "");
    setEmailError("");
    setEmailModalOpen(true);
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTarget) return;
    setEmailSaving(true);
    setEmailError("");
    try {
      await patchWorkspaceAdmin(emailTarget.id, {
        email: emailValue.trim(),
      });
      setEmailModalOpen(false);
      setEmailTarget(null);
      load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as Error).message)
          : "Could not update email.";
      setEmailError(msg);
    } finally {
      setEmailSaving(false);
    }
  };

  const openPwd = (a: WorkspaceAdminEntry) => {
    setPwdTarget(a);
    setPwdForm({ new_password: "", confirm: "" });
    setPwdError("");
    setPwdModalOpen(true);
  };

  const submitPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdTarget) return;
    if (pwdForm.new_password !== pwdForm.confirm) {
      setPwdError("Passwords do not match.");
      return;
    }
    setPwdSaving(true);
    setPwdError("");
    try {
      await resetWorkspaceAdminPassword(pwdTarget.id, pwdForm.new_password);
      setPwdModalOpen(false);
      setPwdTarget(null);
    } catch {
      setPwdError("Could not reset password.");
    } finally {
      setPwdSaving(false);
    }
  };

  if (wsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-sanctum-muted">Loading…</p>
      </div>
    );
  }

  if ((workspace?.role ?? "owner") !== "owner") {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="mb-4 text-2xl font-bold text-sanctum-mist">Admins</h1>
        <p className="text-sanctum-muted">
          Only the workspace owner can manage dashboard admins.{" "}
          <Link href="/dashboard" className="link-accent">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sanctum-mist">Workspace admins</h1>
        <p className="mt-1 text-sm text-sanctum-muted">
          Team leads can manage members, teams, projects, and environments. Billing
          stays with the account owner.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="sanctum-card mb-8 space-y-4 p-6"
      >
        <h2 className="text-lg font-semibold text-sanctum-mist">Add admin</h2>
        {formError ? (
          <div
            className="rounded-md border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger"
            role="alert"
          >
            {formError}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-sanctum-muted" htmlFor="adm-username">
              Username
            </label>
            <input
              id="adm-username"
              className="sanctum-input w-full"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-sanctum-muted" htmlFor="adm-password">
              Temporary password
            </label>
            <input
              id="adm-password"
              type="password"
              className="sanctum-input w-full"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-sanctum-muted" htmlFor="adm-email">
              Email (optional)
            </label>
            <input
              id="adm-email"
              type="email"
              className="sanctum-input w-full"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
            />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Creating…" : "Create admin"}
        </button>
      </form>

      {loadError ? (
        <p className="mb-4 text-sm text-danger">{loadError}</p>
      ) : null}

      <div className="sanctum-card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-sanctum-line/15">
          <thead className="bg-sanctum-ink/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-sanctum-muted">
                Added
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sanctum-line/15">
            {admins.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-sanctum-muted"
                >
                  No workspace admins yet.
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.03]">
                  <td className="px-6 py-4 font-medium text-sanctum-mist">
                    {a.username}
                  </td>
                  <td className="px-6 py-4 text-sanctum-muted">
                    {a.email || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-sanctum-muted">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEmail(a)}
                      className="btn-secondary mr-2 text-sm"
                    >
                      Edit email
                    </button>
                    <button
                      type="button"
                      onClick={() => openPwd(a)}
                      className="btn-secondary mr-2 text-sm"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(a)}
                      className="rounded-md border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger-surface"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal
        open={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setEmailTarget(null);
        }}
        title={
          emailTarget
            ? `Email — ${emailTarget.username}`
            : "Edit email"
        }
      >
        <form onSubmit={(e) => void submitEmail(e)} className="space-y-4">
          {emailError ? (
            <div className="rounded-md border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger">
              {emailError}
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-sanctum-muted" htmlFor="adm-email-edit">
              Email
            </label>
            <input
              id="adm-email-edit"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              className="sanctum-input w-full"
              placeholder="Used for password reset and notifications"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-sanctum-muted">
              Leave empty if this admin should not receive email.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEmailModalOpen(false);
                setEmailTarget(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={emailSaving} className="btn-primary">
              {emailSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={pwdModalOpen}
        onClose={() => {
          setPwdModalOpen(false);
          setPwdTarget(null);
        }}
        title={`Reset password — ${pwdTarget?.username ?? ""}`}
      >
        <form onSubmit={(e) => void submitPwd(e)} className="space-y-4">
          {pwdError ? (
            <div className="rounded-md border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger">
              {pwdError}
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-sanctum-muted" htmlFor="np">
              New password
            </label>
            <input
              id="np"
              type="password"
              className="sanctum-input w-full"
              value={pwdForm.new_password}
              onChange={(e) =>
                setPwdForm((f) => ({ ...f, new_password: e.target.value }))
              }
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-sanctum-muted" htmlFor="npc">
              Confirm
            </label>
            <input
              id="npc"
              type="password"
              className="sanctum-input w-full"
              value={pwdForm.confirm}
              onChange={(e) =>
                setPwdForm((f) => ({ ...f, confirm: e.target.value }))
              }
              required
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPwdModalOpen(false);
                setPwdTarget(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={pwdSaving} className="btn-primary">
              {pwdSaving ? "Saving…" : "Update password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
