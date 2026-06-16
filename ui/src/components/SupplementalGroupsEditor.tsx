"use client";

import { useCallback, useState } from "react";
import {
  BLOCKED_SUPPLEMENTAL_GROUP_HINTS,
  validateSupplementalGroupName,
} from "@/lib/linuxGroups";

type SupplementalGroupsEditorProps = {
  groups: string[];
  onChange: (groups: string[]) => void;
  disabled?: boolean;
  id?: string;
};

export default function SupplementalGroupsEditor({
  groups,
  onChange,
  disabled = false,
  id,
}: SupplementalGroupsEditorProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addGroup = useCallback(
    (raw: string) => {
      const name = raw.trim();
      if (!name) return;
      const validation = validateSupplementalGroupName(name);
      if (!validation.ok) {
        setError(validation.message);
        return;
      }
      if (groups.includes(name)) {
        setError(`"${name}" is already listed.`);
        return;
      }
      setError(null);
      onChange([...groups, name]);
      setInput("");
    },
    [groups, onChange]
  );

  const removeGroup = (name: string) => {
    onChange(groups.filter((g) => g !== name));
    setError(null);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-sanctum-mist"
      >
        Supplemental Linux groups
      </label>
      <p className="text-xs leading-relaxed text-sanctum-muted">
        Add existing Linux groups that assigned users should belong to on this
        environment. Sanctum adds membership during provisioning and does not
        create missing groups by default. Privileged system groups (e.g.{" "}
        {BLOCKED_SUPPLEMENTAL_GROUP_HINTS}) are blocked.
      </p>
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 rounded-full border border-sanctum-line/30 bg-sanctum-ink/60 px-2.5 py-1 text-xs text-sanctum-mist"
          >
            {g}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeGroup(g)}
                className="rounded p-0.5 text-sanctum-muted hover:text-danger"
                aria-label={`Remove group ${g}`}
              >
                <i className="fa-solid fa-xmark text-[10px]" aria-hidden />
              </button>
            ) : null}
          </span>
        ))}
      </div>
      {!disabled ? (
        <div className="flex flex-wrap gap-2">
          <input
            id={id}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGroup(input);
              }
            }}
            placeholder="www-data, deployers, app-maintainers"
            className="sanctum-input min-w-[12rem] flex-1 text-sm"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => addGroup(input)}
            className="btn-secondary text-sm"
          >
            Add group
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
