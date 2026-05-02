"use client";

import { useState, useTransition } from "react";
import { updateStaff } from "../actions";

const ROLES = [
  { id: "owner", label: "Owner" },
  { id: "manager", label: "Manager" },
  { id: "cashier", label: "Cashier" },
  { id: "server", label: "Server" },
];

export function EditStaffForm({
  slug,
  staffId,
  initialName,
  initialRole,
}: {
  slug: string;
  staffId: string;
  initialName: string;
  initialRole: string;
}) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState(initialRole);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return setError("Name is required");
    setError(null);
    start(async () => {
      try {
        await updateStaff({ slug, staffId, name, role });
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-base focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Role
        </span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="col-span-full rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}

      <div className="col-span-full">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
