"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createStaff } from "../actions";

const ROLES = [
  { id: "owner", label: "Owner" },
  { id: "manager", label: "Manager" },
  { id: "cashier", label: "Cashier" },
  { id: "server", label: "Server" },
];

export function NewStaffForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("cashier");
  const [pin, setPin] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return setError("Name is required");
    if (!/^\d{3,8}$/.test(pin)) return setError("PIN must be 3-8 digits");
    setError(null);
    start(async () => {
      try {
        await createStaff({ slug, name, role, pin });
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Could not create");
      }
    });
  }

  return (
    <div className="grid max-w-md gap-4">
      <Field label="Name">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-base focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Field>

      <Field label="Role">
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
      </Field>

      <Field label="PIN">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-2xl tracking-widest tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        <p className="mt-1 text-xs text-[color:var(--color-muted)]">
          Stored as a scrypt hash. Reset later if forgotten.
        </p>
      </Field>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create staff"}
        </button>
        <Link
          href={`/admin/${slug}/staff` as never}
          className="rounded-lg border border-[color:var(--color-foreground)]/15 px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
