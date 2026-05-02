"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { closeShiftAndSignOut } from "../login/actions";

const fmt = (cents: number) =>
  `${cents < 0 ? "−" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;

export function ClockOutForm({
  slug,
  expectedEndingCashCents,
}: {
  slug: string;
  expectedEndingCashCents: number | null;
}) {
  const [raw, setRaw] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cents = parseDollarsToCents(raw);
  const variance =
    cents != null && expectedEndingCashCents != null
      ? cents - expectedEndingCashCents
      : null;

  function submit() {
    if (cents == null) {
      setError("Enter the counted cash, e.g. 250.00");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await closeShiftAndSignOut({ slug, endingCashCents: cents });
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Could not clock out");
      }
    });
  }

  return (
    <div className="mt-5 space-y-3">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Counted cash
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={raw}
          onChange={(e) => {
            setError(null);
            setRaw(e.target.value);
          }}
          className="mt-1 block w-full rounded-lg border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-3 text-2xl font-semibold tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </label>

      {variance !== null && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            variance === 0
              ? "bg-emerald-50 text-emerald-900"
              : variance > 0
                ? "bg-amber-50 text-amber-900"
                : "bg-rose-50 text-rose-900"
          }`}
        >
          Variance:{" "}
          <span className="font-semibold tabular-nums">{fmt(variance)}</span>
          {variance === 0 && " · drawer matches"}
          {variance > 0 && " · over"}
          {variance < 0 && " · short"}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Link
          href={`/pos/${slug}` as never}
          className="flex-1 rounded-lg border border-[color:var(--color-foreground)]/15 py-3 text-center text-sm font-medium hover:bg-[color:var(--color-foreground)]/5"
        >
          Back to POS
        </Link>
        <button
          onClick={submit}
          disabled={pending || cents == null}
          className="flex-1 rounded-lg bg-[color:var(--color-foreground)] py-3 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
        >
          {pending ? "Closing…" : "Close shift"}
        </button>
      </div>
    </div>
  );
}

function parseDollarsToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, "");
  if (trimmed === "") return null;
  if (!/^\d*(\.\d{0,2})?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
