"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { apiFetch, Member } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isAdminRole } from "@/lib/roles";

export default function KeysPage() {
  const { workspace } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const isAdmin = isAdminRole(workspace);

  const load = useCallback(() => {
    if (!isAdmin) return;
    apiFetch<Member[]>("/members/").then(setMembers);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.flatMap((member) =>
      member.ssh_keys
        .filter((key) => {
          if (!term) return true;
          return `${member.username} ${member.email} ${key.label} ${key.public_key}`
            .toLowerCase()
            .includes(term);
        })
        .map((key) => ({ member, key }))
    );
  }, [members, search]);

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-sanctum-muted">
        SSH key inventory is available to workspace admins.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="SSH Keys"
        subtitle="Workspace key inventory and security model."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="sanctum-card p-5">
          <h2 className="mb-2 font-semibold text-sanctum-mist">Public keys only</h2>
          <p className="text-sm text-sanctum-muted">
            Sanctum stores public keys. Generated private keys are shown once and
            should be saved by the member or admin immediately.
          </p>
        </div>
        <div className="sanctum-card p-5">
          <h2 className="mb-2 font-semibold text-sanctum-mist">Provisioned by env</h2>
          <p className="text-sm text-sanctum-muted">
            Servers receive keys through project/environment assignments and the
            next provision cron run.
          </p>
        </div>
        <div className="sanctum-card p-5">
          <h2 className="mb-2 font-semibold text-sanctum-mist">Access requests</h2>
          <p className="text-sm text-sanctum-muted">
            Member key requests are reviewed from the Requests inbox before keys
            are issued.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search keys by member, label, or public key..."
          className="sanctum-input max-w-lg"
        />
      </div>

      <div className="sanctum-card overflow-hidden">
        {rows.length > 0 ? (
          <div className="divide-y divide-sanctum-line/15">
            {rows.map(({ member, key }) => (
              <div
                key={`${member.id}-${key.id}`}
                className="grid gap-2 p-4 text-sm md:grid-cols-[12rem_12rem_1fr]"
              >
                <div className="font-semibold text-sanctum-mist">
                  {member.username}
                </div>
                <div className="text-sanctum-muted">{key.label || "No label"}</div>
                <code className="min-w-0 truncate font-mono text-xs text-sanctum-muted">
                  {key.public_key}
                </code>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-sanctum-muted">
            No keys match this search.
          </div>
        )}
      </div>
    </div>
  );
}
