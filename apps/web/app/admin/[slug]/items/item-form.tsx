"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createItem,
  type ItemFormInput,
  type VariantInput,
  updateItem,
} from "./actions";

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
  variants: VariantInput[];
  modifierGroupIds: string[];
};

type ModifierGroupOption = {
  id: string;
  name: string;
  selectionType: string;
  required: boolean;
  modifierCount: number;
};

export function ItemForm({
  slug,
  mode,
  initial,
  categories,
  modifierGroups,
}: {
  slug: string;
  mode: Mode;
  initial: InitialValues;
  categories: string[];
  modifierGroups: ModifierGroupOption[];
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
  const [variants, setVariants] = useState<(VariantInput & { _key: string })[]>(
    initial.variants.map((v) => ({ ...v, _key: v.id ?? cryptoKey() })),
  );
  const [groupIds, setGroupIds] = useState<string[]>(initial.modifierGroupIds);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        _key: cryptoKey(),
        name: "",
        priceDeltaCents: 0,
        isDefault: prev.length === 0,
        sortOrder: prev.length,
      },
    ]);
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.filter((v) => v._key !== key));
  }

  function patchVariant(key: string, patch: Partial<VariantInput>) {
    setVariants((prev) =>
      prev.map((v) => {
        if (v._key !== key) return v;
        return { ...v, ...patch };
      }),
    );
  }

  function setDefaultVariant(key: string) {
    setVariants((prev) =>
      prev.map((v) => ({ ...v, isDefault: v._key === key })),
    );
  }

  function toggleGroup(id: string) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

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
      variants: variants.map(({ _key: _k, ...v }, idx) => ({
        ...v,
        sortOrder: idx,
      })),
      modifierGroupIds: groupIds,
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
    <div className="space-y-8">
      <Section title="Basics">
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
        </div>
      </Section>

      <Section
        title="Variants"
        hint="Sizes and similar item-specific options. Optional."
      >
        {variants.length === 0 ? (
          <p className="rounded-md bg-[color:var(--color-foreground)]/5 px-3 py-2 text-sm text-[color:var(--color-muted)]">
            No variants — the cashier will add this item directly to the cart
            without a configurator.
          </p>
        ) : (
          <ul className="space-y-2">
            {variants.map((v) => (
              <li
                key={v._key}
                className="grid grid-cols-12 gap-2 rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-2"
              >
                <input
                  value={v.name}
                  onChange={(e) =>
                    patchVariant(v._key, { name: e.target.value })
                  }
                  placeholder="12oz"
                  className="col-span-4 rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-2.5 py-1.5 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
                />
                <div className="col-span-3 flex items-baseline rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-2">
                  <span className="mr-1 text-sm text-[color:var(--color-muted)]">
                    $
                  </span>
                  <input
                    value={(v.priceDeltaCents / 100).toFixed(2)}
                    onChange={(e) =>
                      patchVariant(v._key, {
                        priceDeltaCents: parseDollarDeltaToCents(
                          e.target.value,
                        ),
                      })
                    }
                    className="w-full bg-transparent py-1 text-sm tabular-nums focus:outline-none"
                  />
                </div>
                <input
                  value={v.sku ?? ""}
                  onChange={(e) =>
                    patchVariant(v._key, { sku: e.target.value })
                  }
                  placeholder="SKU"
                  className="col-span-2 rounded-md border border-[color:var(--color-foreground)]/15 bg-white/70 px-2.5 py-1.5 font-mono text-xs focus:border-[color:var(--color-accent)] focus:outline-none"
                />
                <label className="col-span-2 inline-flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="variant-default"
                    checked={v.isDefault}
                    onChange={() => setDefaultVariant(v._key)}
                  />
                  Default
                </label>
                <button
                  onClick={() => removeVariant(v._key)}
                  className="col-span-1 text-xs text-rose-700 hover:underline"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={addVariant}
          className="mt-3 rounded-md border border-[color:var(--color-foreground)]/15 px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--color-foreground)]/5"
        >
          + Add variant
        </button>
      </Section>

      <Section
        title="Modifier groups"
        hint="Reuses groups from the Modifier groups page. Order here determines configurator order."
      >
        {modifierGroups.length === 0 ? (
          <p className="rounded-md bg-[color:var(--color-foreground)]/5 px-3 py-2 text-sm">
            No groups yet.{" "}
            <Link
              href={`/admin/${slug}/modifier-groups/new` as never}
              className="underline decoration-[color:var(--color-accent)] underline-offset-4"
            >
              Create one →
            </Link>
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {modifierGroups.map((g) => {
              const checked = groupIds.includes(g.id);
              return (
                <li key={g.id}>
                  <label
                    className={`flex cursor-pointer items-baseline gap-3 rounded-lg border p-3 ${
                      checked
                        ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5"
                        : "border-[color:var(--color-foreground)]/15 bg-white/40 hover:border-[color:var(--color-foreground)]/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroup(g.id)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{g.name}</div>
                      <div className="text-xs text-[color:var(--color-muted)]">
                        {g.selectionType === "single" ? "pick one" : "pick any"}
                        {g.required ? " · required" : ""} · {g.modifierCount}{" "}
                        modifier{g.modifierCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-5">
      <header className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          {title}
        </h3>
        {hint && (
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            {hint}
          </p>
        )}
      </header>
      {children}
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

function parseDollarDeltaToCents(raw: string): number {
  const trimmed = raw.trim().replace(/^\$/, "");
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function cryptoKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
