"use client";

import { useState, useTransition } from "react";
import { resetStaffPin } from "../actions";

export function ResetPinForm({
  slug,
  staffId,
}: {
  slug: string;
  staffId: string;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function submit() {
    if (!/^\d{3,8}$/.test(pin)) return setError("PIN must be 3-8 digits");
    if (pin !== confirm) return setError("PINs don't match");
    setError(null);
    start(async () => {
      try {
        await resetStaffPin({ slug, staffId, pin });
        setSavedAt(Date.now());
        setPin("");
        setConfirm("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reset");
      }
    });
  }

  return (
    <div className="grid max-w-md gap-3">
      <p className="text-sm text-[color:var(--color-muted)]">
        Tell the cashier the new PIN out loud — we never display the old one.
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          New PIN
        </span>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-xl tracking-widest tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Confirm
        </span>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-xl tracking-widest tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}
      {savedAt && (
        <p className="text-xs text-emerald-700">
          PIN updated · let the cashier know.
        </p>
      )}

      <div>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Reset PIN"}
        </button>
      </div>
    </div>
  );
}
