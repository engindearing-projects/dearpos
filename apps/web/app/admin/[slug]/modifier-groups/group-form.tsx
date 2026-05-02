"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createModifierGroup,
  type GroupInput,
  type ModifierInput,
  updateModifierGroup,
} from "./actions";

type Mode = { kind: "create" } | { kind: "edit"; groupId: string };

export function GroupForm({
  slug,
  mode,
  initial,
}: {
  slug: string;
  mode: Mode;
  initial: GroupInput;
}) {
  const [name, setName] = useState(initial.name);
  const [selectionType, setSelectionType] = useState<"single" | "multiple">(
    initial.selectionType,
  );
  const [required, setRequired] = useState(initial.required);
  const [minSelections, setMinSelections] = useState(initial.minSelections);
  const [maxSelections, setMaxSelections] = useState<number | null>(
    initial.maxSelections,
  );
  const [modifiers, setModifiers] = useState<
    (ModifierInput & { _key: string })[]
  >(
    initial.modifiers.length > 0
      ? initial.modifiers.map((m) => ({ ...m, _key: m.id ?? cryptoKey() }))
      : [
          {
            _key: cryptoKey(),
            name: "",
            priceDeltaCents: 0,
            isDefault: false,
            sortOrder: 0,
          },
        ],
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setModifiers((prev) => [
      ...prev,
      {
        _key: cryptoKey(),
        name: "",
        priceDeltaCents: 0,
        isDefault: false,
        sortOrder: prev.length,
      },
    ]);
  }

  function removeRow(key: string) {
    setModifiers((prev) => prev.filter((m) => m._key !== key));
  }

  function updateRow(key: string, patch: Partial<ModifierInput>) {
    setModifiers((prev) =>
      prev.map((m) => (m._key === key ? { ...m, ...patch } : m)),
    );
  }

  function submit() {
    if (!name.trim()) return setError("Name is required");
    if (modifiers.length === 0) return setError("Add at least one modifier");
    setError(null);
    const payload: GroupInput = {
      name: name.trim(),
      selectionType,
      required,
      minSelections,
      maxSelections,
      modifiers: modifiers.map(({ _key: _k, ...m }, idx) => ({
        ...m,
        sortOrder: idx,
      })),
    };
    start(async () => {
      try {
        if (mode.kind === "create") {
          await createModifierGroup({ slug, group: payload });
        } else {
          await updateModifierGroup({
            slug,
            groupId: mode.groupId,
            group: payload,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Milk"
            className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-base focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </Field>

        <Field label="Selection">
          <select
            value={selectionType}
            onChange={(e) =>
              setSelectionType(e.target.value as "single" | "multiple")
            }
            className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            <option value="single">Pick one</option>
            <option value="multiple">Pick any</option>
          </select>
        </Field>

        <Field label="Min selections">
          <input
            type="number"
            min={0}
            value={minSelections}
            onChange={(e) => setMinSelections(Number(e.target.value))}
            className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </Field>

        <Field label="Max selections">
          <input
            type="number"
            min={0}
            value={maxSelections ?? ""}
            onChange={(e) =>
              setMaxSelections(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            placeholder="(no max)"
            className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </Field>

        <label className="col-span-full inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required — cashier must pick at least one before adding to cart
        </label>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Modifiers
        </h3>
        <ul className="space-y-2">
          {modifiers.map((m) => (
            <li
              key={m._key}
              className="grid grid-cols-12 gap-2 rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-2"
            >
              <input
                value={m.name}
                onChange={(e) => updateRow(m._key, { name: e.target.value })}
                placeholder="Oat milk"
                className="col-span-5 rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-2.5 py-1.5 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              />
              <div className="col-span-3 flex items-baseline rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-2">
                <span className="mr-1 text-sm text-[color:var(--color-muted)]">
                  $
                </span>
                <input
                  value={(m.priceDeltaCents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateRow(m._key, {
                      priceDeltaCents: parseDollars(e.target.value),
                    })
                  }
                  className="w-full bg-transparent py-1 text-sm tabular-nums focus:outline-none"
                />
              </div>
              <label className="col-span-3 inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={m.isDefault}
                  onChange={(e) =>
                    updateRow(m._key, { isDefault: e.target.checked })
                  }
                />
                Default
              </label>
              <button
                onClick={() => removeRow(m._key)}
                className="col-span-1 text-xs text-rose-700 hover:underline"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={addRow}
          className="mt-3 rounded-md border border-[color:var(--color-foreground)]/15 px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--color-foreground)]/5"
        >
          + Add modifier
        </button>
      </div>

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
          {pending
            ? "Saving…"
            : mode.kind === "create"
              ? "Create group"
              : "Save changes"}
        </button>
        <Link
          href={`/admin/${slug}/modifier-groups` as never}
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

function parseDollars(raw: string): number {
  const n = Number(raw.trim().replace(/^\$/, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function cryptoKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
