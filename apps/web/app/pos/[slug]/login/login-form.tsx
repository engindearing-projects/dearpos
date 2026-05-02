"use client";

import { useState, useTransition } from "react";
import { signIn } from "./actions";

type Staff = { id: string; name: string; role: string };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function LoginForm({
  slug,
  businessName,
  staff,
}: {
  slug: string;
  businessName: string;
  staff: Staff[];
}) {
  const [selected, setSelected] = useState<Staff | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pressKey(k: string) {
    setError(null);
    if (k === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!k) return;
    if (pin.length >= 8) return;
    const next = pin + k;
    setPin(next);
    if (next.length >= 4 && selected) {
      submit(next);
    }
  }

  function submit(pinValue: string) {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await signIn({
          slug,
          staffId: selected.id,
          pin: pinValue,
        });
        if (result && !result.ok) {
          setError(result.error);
          setPin("");
        }
        // success path redirects, never returns here
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError("Something went wrong");
        setPin("");
      }
    });
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {businessName}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Pick your name to clock in.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {staff.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSelected(s)}
                className="w-full rounded-xl border border-[color:var(--color-foreground)]/10 bg-white/60 p-5 text-left shadow-sm transition hover:border-[color:var(--color-accent)] hover:shadow-md active:scale-[0.98]"
              >
                <div className="text-lg font-semibold">{s.name}</div>
                <div className="mt-0.5 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                  {s.role}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xs">
      <button
        onClick={() => {
          setSelected(null);
          setPin("");
          setError(null);
        }}
        className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
      >
        ← Pick a different name
      </button>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {selected.name}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">
        Enter your PIN.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full ${
              pin.length > i
                ? "bg-[color:var(--color-foreground)]"
                : "bg-[color:var(--color-foreground)]/15"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-2">
        {KEYS.map((k, i) => (
          <button
            key={i}
            onClick={() => pressKey(k)}
            disabled={pending || !k}
            className={`aspect-square rounded-lg text-2xl font-semibold transition ${
              k
                ? "border border-[color:var(--color-foreground)]/15 bg-white/60 hover:bg-[color:var(--color-foreground)]/5 active:scale-[0.97] disabled:opacity-50"
                : "invisible"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {pending && (
        <p className="mt-4 text-center text-xs text-[color:var(--color-muted)]">
          Checking…
        </p>
      )}
    </div>
  );
}
