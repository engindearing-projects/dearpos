"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createItem, type ItemFormInput, updateItem } from "./actions";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; itemId: string };

type InitialValues = {
  name: string;
  description: string;
  category: string;
  basePriceCents: number;
  taxable: boolean;
  sku: string;
  barcode: string;
  kitchenStation: string;
  trackInventory: boolean;
  sortOrder: number;
};

export function ItemForm({
  slug,
  mode,
  initial,
  categories,
}: {
  slug: string;
  mode: Mode;
  initial: InitialValues;
  categories: string[];
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [priceRaw, setPriceRaw] = useState(
    initial.basePriceCents > 0
      ? (initial.basePriceCents / 100).toFixed(2)
      : "",
  );
  const [taxable, setTaxable] = useState(initial.taxable);
  const [sku, setSku] = useState(initial.sku);
  const [barcode, setBarcode] = useState(initial.barcode);
  const [kitchenStation, setKitchenStation] = useState(initial.kitchenStation);
  const [trackInventory, setTrackInventory] = useState(initial.trackInventory);
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const cents = parseDollarsToCents(priceRaw);
    if (cents == null) {
      setError("Enter a price like 4.50");
      return;
    }
    setError(null);
    const payload: ItemFormInput = {
      slug,
      name,
      description,
      category,
      basePriceCents: cents,
      taxable,
      sku,
      barcode,
      kitchenStation,
      trackInventory,
      sortOrder,
    };
    start(async () => {
      try {
        if (mode.kind === "create") {
          await createItem(payload);
        } else {
          await updateItem({ ...payload, itemId: mode.itemId });
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
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" full>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-base focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Field>

      <Field label="Description" full>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Field>

      <Field label="Category">
        <input
          list="dearpos-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Espresso"
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        <datalist id="dearpos-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label="Price">
        <div className="flex items-baseline rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3">
          <span className="mr-1 text-base text-[color:var(--color-muted)]">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={priceRaw}
            onChange={(e) => setPriceRaw(e.target.value)}
            placeholder="4.50"
            className="w-full bg-transparent py-2 text-base tabular-nums focus:outline-none"
          />
        </div>
      </Field>

      <Field label="SKU">
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="ESP-LATTE"
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 font-mono text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Field>

      <Field label="Barcode">
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="0000000000000"
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 font-mono text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Field>

      <Field label="Kitchen station">
        <select
          value={kitchenStation}
          onChange={(e) => setKitchenStation(e.target.value)}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          <option value="">— none —</option>
          <option value="bar">bar</option>
          <option value="grill">grill</option>
          <option value="expo">expo</option>
          <option value="fryer">fryer</option>
          <option value="cold">cold</option>
        </select>
      </Field>

      <Field label="Sort order">
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="block w-full rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm tabular-nums focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Field>

      <label className="col-span-full inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={taxable}
          onChange={(e) => setTaxable(e.target.checked)}
        />
        Taxable
      </label>

      <label className="col-span-full inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={trackInventory}
          onChange={(e) => setTrackInventory(e.target.checked)}
        />
        Track inventory (deductions wire up in v0.2)
      </label>

      {error && (
        <p className="col-span-full rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}

      <div className="col-span-full flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : mode.kind === "create"
              ? "Create item"
              : "Save changes"}
        </button>
        <Link
          href={`/admin/${slug}/items` as never}
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
  full = false,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={full ? "col-span-full block" : "block"}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
        {label}
      </span>
      {children}
    </label>
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
