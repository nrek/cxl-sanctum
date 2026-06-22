"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  AccessRequest,
  apiFetch,
  createAccessRequest,
  fetchAccessRequests,
  Project,
} from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isAdminRole } from "@/lib/roles";

export default function ProfilePage() {
  const { workspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [keyLabel, setKeyLabel] = useState("");
  const [requestProject, setRequestProject] = useState<number | "">("");
  const [requestNote, setRequestNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{
    public_key: string;
    private_key: string;
  } | null>(null);

  const isAdmin = isAdminRole(workspace);

  const load = useCallback(() => {
    apiFetch<Project[]>("/projects/").then(setProjects);
    fetchAccessRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitKeyRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    await createAccessRequest({
      kind: "key",
      key_label: keyLabel.trim() || "Workspace key",
      algorithm: "ed25519",
      note: "Profile key request",
    });
    setKeyLabel("");
    setMessage("Key request sent to workspace admins.");
    load();
  };

  const submitAccessRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestProject) return;
    setMessage(null);
    await createAccessRequest({
      kind: "access",
      project: Number(requestProject),
      role_requested: "user",
      note: requestNote.trim(),
    });
    setRequestProject("");
    setRequestNote("");
    setMessage("Access request sent to workspace admins.");
    load();
  };

  const generateAdminKey = async () => {
    if (!workspace?.member_id) {
      setMessage("Your admin login is not linked to a member profile yet.");
      return;
    }
    const result = await apiFetch<{
      public_key: string;
      private_key: string;
    }>(`/members/${workspace.member_id}/generate-key/`, {
      method: "POST",
      body: JSON.stringify({ label: keyLabel.trim() || "Generated key" }),
    });
    setGeneratedKey(result);
    setMessage("Generated keypair. Save the private key now.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My profile"
        subtitle="Identity, current access, and request workflow."
      />

      {message ? (
        <div className="mb-5 rounded-lg border border-sanctum-line bg-sanctum-raised px-4 py-3 text-sm text-sanctum-mist">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="sanctum-card p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sanctum-line bg-sanctum-raised font-mono text-lg font-bold text-sanctum-mist">
              {(workspace?.name || "SX").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-sanctum-mist">
                {workspace?.name || "Sanctum"}
              </h2>
              <p className="font-mono text-xs text-sanctum-muted">
                {workspace?.role || "member"}
              </p>
            </div>
          </div>
          <button type="button" className="btn-secondary text-sm" disabled>
            Avatar upload coming soon
          </button>
        </section>

        <section className="sanctum-card p-6">
          <h2 className="mb-3 text-lg font-semibold text-sanctum-mist">
            Projects & environments you can access
          </h2>
          {projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg border border-sanctum-line/20 bg-sanctum-ink/40 px-3 py-2 text-sm hover:border-sanctum-accent/50"
                >
                  <span className="font-medium text-sanctum-mist">
                    {project.name}
                  </span>
                  <span className="text-sanctum-muted">
                    {project.environment_count ?? 0} env
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-sanctum-muted">
              No assigned projects are visible yet.
            </p>
          )}
        </section>
      </div>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="sanctum-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-sanctum-mist">
            {isAdmin ? "Admin actions" : "Requests"}
          </h2>
          <p className="mb-4 text-sm text-sanctum-muted">
            {isAdmin
              ? "Admins can generate their own key when linked to a member profile."
              : "Members request keys. Admins review and grant them."}
          </p>
          <form onSubmit={submitKeyRequest} className="space-y-3">
            <input
              type="text"
              value={keyLabel}
              onChange={(event) => setKeyLabel(event.target.value)}
              placeholder="Key label, e.g. workstation"
              className="sanctum-input"
            />
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void generateAdminKey()}
                className="btn-primary"
              >
                Generate keypair
              </button>
            ) : (
              <button type="submit" className="btn-primary">
                Request key
              </button>
            )}
          </form>
          {generatedKey ? (
            <div className="mt-4 rounded-lg border border-warning/40 bg-warning-surface p-3">
              <p className="mb-2 text-xs text-warning">
                Private key is shown once. Save it before leaving this page.
              </p>
              <textarea
                readOnly
                value={generatedKey.private_key}
                className="sanctum-input min-h-[10rem] font-mono text-xs"
              />
            </div>
          ) : null}
        </div>

        <div className="sanctum-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-sanctum-mist">
            {isAdmin ? "Add yourself to access" : "Request access"}
          </h2>
          <p className="mb-4 text-sm text-sanctum-muted">
            {isAdmin
              ? "Use Projects for full access matrix control."
              : "Ask an admin to grant a project or environment."}
          </p>
          {isAdmin ? (
            <Link href="/projects" className="btn-primary">
              Open Projects
            </Link>
          ) : (
            <form onSubmit={submitAccessRequest} className="space-y-3">
              <select
                value={requestProject}
                onChange={(event) =>
                  setRequestProject(event.target.value ? Number(event.target.value) : "")
                }
                className="sanctum-select w-full"
                required
              >
                <option value="">Choose project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <textarea
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                placeholder="Why do you need access?"
                className="sanctum-input min-h-[6rem]"
              />
              <button type="submit" className="btn-primary">
                Request access
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="sanctum-card mt-5 p-6">
        <h2 className="mb-3 text-lg font-semibold text-sanctum-mist">
          Recent requests
        </h2>
        {requests.length > 0 ? (
          <div className="space-y-2">
            {requests.slice(0, 6).map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sanctum-line/20 bg-sanctum-ink/40 px-3 py-2 text-sm"
              >
                <span className="text-sanctum-mist">
                  {request.kind === "key"
                    ? request.key_label || "SSH key"
                    : request.project_name || "Access request"}
                </span>
                <span className="font-mono text-xs uppercase text-sanctum-muted">
                  {request.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-sanctum-muted">No requests yet.</p>
        )}
      </section>
    </div>
  );
}
