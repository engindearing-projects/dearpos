"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "./actions";
import { setShiftStartingCash, switchStaff } from "./login/actions";

type Modifier = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
};

type ModifierGroup = {
  id: string;
  name: string;
  selectionType: "single" | "multiple";
  required: boolean;
  maxSelections: number | null;
  modifiers: Modifier[];
};

type Variant = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
};

type Item = {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string;
  basePriceCents: number;
  kitchenStation: string | null;
  variants: Variant[];
  modifierGroups: ModifierGroup[];
};

type CartLine = {
  cartLineId: string;
  item: Item;
  variant: Variant | null;
  selectedModifiers: Modifier[];
  quantity: number;
};

type Business = {
  slug: string;
  name: string;
  location: string;
  taxRate: number;
  tipSuggestions: number[];
  primaryAction: "ringUp" | "openTable";
  cardPaymentsAvailable: boolean;
  logoUrl: string | null;
};

type Staff = {
  id: string;
  name: string;
  role: string;
};

type Shift = {
  id: string;
  startingCashCents: number | null;
};

const fmt = (cents: number) =>
  `${cents < 0 ? "−" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;

function lineUnitCents(line: CartLine): number {
  const variantDelta = line.variant?.priceDeltaCents ?? 0;
  const modDelta = line.selectedModifiers.reduce(
    (s, m) => s + m.priceDeltaCents,
    0
  );
  return line.item.basePriceCents + variantDelta + modDelta;
}

export function POSScreen({
  business,
  staff,
  shift,
  items,
}: {
  business: Business;
  staff: Staff;
  shift: Shift;
  items: Item[];
}) {
  const router = useRouter();
  const [startingCashOpen, setStartingCashOpen] = useState(
    shift.startingCashCents == null,
  );
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const item of items) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        ordered.push(item.category);
      }
    }
    return ordered;
  }, [items]);

  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [configuringItem, setConfiguringItem] = useState<Item | null>(null);
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [discount, setDiscount] = useState<{
    type: "percent" | "amount";
    value: number; // percent: 0..1, amount: cents
    reason: string;
  } | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [isCharging, startCharging] = useTransition();
  const [chargeError, setChargeError] = useState<string | null>(null);

  const visibleItems = items.filter((i) => i.category === activeCategory);

  const subtotalCents = cart.reduce(
    (s, l) => s + lineUnitCents(l) * l.quantity,
    0
  );
  const rawDiscountCents = discount
    ? discount.type === "percent"
      ? Math.round(subtotalCents * discount.value)
      : discount.value
    : 0;
  const discountCents = Math.min(rawDiscountCents, subtotalCents);
  const discountedSubtotalCents = subtotalCents - discountCents;
  const taxCents = Math.round(discountedSubtotalCents * business.taxRate);
  const tipCents =
    tipPercent !== null
      ? Math.round(discountedSubtotalCents * tipPercent)
      : 0;
  const totalCents = discountedSubtotalCents + taxCents + tipCents;

  function handleItemClick(item: Item) {
    if (item.variants.length > 0 || item.modifierGroups.length > 0) {
      setConfiguringItem(item);
    } else {
      addToCart(item, null, []);
    }
  }

  function addToCart(
    item: Item,
    variant: Variant | null,
    selectedModifiers: Modifier[]
  ) {
    setCart((prev) => [
      ...prev,
      {
        cartLineId: crypto.randomUUID(),
        item,
        variant,
        selectedModifiers,
        quantity: 1,
      },
    ]);
    setConfiguringItem(null);
  }

  function adjustQuantity(cartLineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.cartLineId === cartLineId
            ? { ...l, quantity: l.quantity + delta }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function clearCart() {
    setCart([]);
    setTipPercent(null);
    setDiscount(null);
    setChargeError(null);
  }

  function handleCharge(method: "cash" | "card") {
    setChargeError(null);
    startCharging(async () => {
      try {
        await createOrder({
          businessSlug: business.slug,
          paymentMethod: method,
          tipCents,
          discountCents,
          discountReason: discount?.reason.trim() || null,
          lines: cart.map((line) => ({
            itemId: line.item.id,
            variantId: line.variant?.id ?? null,
            modifierIds: line.selectedModifiers.map((m) => m.id),
            quantity: line.quantity,
          })),
        });
        // server action redirects on success — anything past here is the failure path
      } catch (err) {
        // NEXT_REDIRECT throws look like errors but are how the redirect propagates.
        // Let the framework handle them.
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setChargeError(
          err instanceof Error ? err.message : "Could not complete sale",
        );
      }
    });
  }

  return (
    <div className="flex h-screen flex-col bg-[color:var(--color-background)]">
      <header className="flex items-center justify-between border-b border-[color:var(--color-foreground)]/10 bg-white/60 px-5 py-3">
        <div className="flex items-center gap-3">
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt=""
              className="h-9 w-9 rounded-md object-cover"
            />
          )}
          <div>
            <div className="text-base font-semibold">{business.name}</div>
            <div className="text-xs text-[color:var(--color-muted)]">
              {business.location} · POS
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[color:var(--color-muted)]">
            tax {(business.taxRate * 100).toFixed(2)}%
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{staff.name}</span>
            <span className="text-[color:var(--color-muted)]">
              · {staff.role}
            </span>
          </div>
          <button
            onClick={() => setStartingCashOpen(true)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              shift.startingCashCents == null
                ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
            }`}
            title="Set or update the starting cash for this shift"
          >
            Drawer:{" "}
            {shift.startingCashCents == null
              ? "set"
              : fmt(shift.startingCashCents)}
          </button>
          <button
            onClick={() =>
              switchStaff({ slug: business.slug }).catch((err) => {
                if (
                  err instanceof Error &&
                  err.message.startsWith("NEXT_REDIRECT")
                )
                  throw err;
              })
            }
            className="rounded-md border border-[color:var(--color-foreground)]/15 px-2.5 py-1 text-[11px] font-medium hover:bg-[color:var(--color-foreground)]/5"
            title="Switch staff without closing shift"
          >
            Switch
          </button>
          <button
            onClick={() =>
              router.push(`/pos/${business.slug}/clock-out` as never)
            }
            className="rounded-md bg-[color:var(--color-foreground)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-background)] hover:opacity-90"
          >
            Clock out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          <nav className="flex gap-1 overflow-x-auto border-b border-[color:var(--color-foreground)]/10 bg-white/40 px-3 py-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium ${
                  activeCategory === cat
                    ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                    : "hover:bg-[color:var(--color-foreground)]/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="flex flex-col items-start rounded-xl border border-[color:var(--color-foreground)]/10 bg-white/60 p-4 text-left shadow-sm transition hover:border-[color:var(--color-accent)] hover:shadow-md active:scale-[0.98]"
                >
                  <div className="text-base font-semibold leading-tight">
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="mt-1 line-clamp-2 text-xs text-[color:var(--color-muted)]">
                      {item.description}
                    </div>
                  )}
                  <div className="mt-3 flex w-full items-baseline justify-between">
                    <span className="text-lg font-semibold">
                      {fmt(item.basePriceCents)}
                    </span>
                    {(item.variants.length > 0 ||
                      item.modifierGroups.length > 0) && (
                      <span className="text-xs text-[color:var(--color-accent)]">
                        Configure →
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>

        <aside className="flex w-[380px] shrink-0 flex-col border-l border-[color:var(--color-foreground)]/10 bg-white/60">
          <div className="flex items-center justify-between border-b border-[color:var(--color-foreground)]/10 px-5 py-3">
            <div className="text-sm font-semibold uppercase tracking-wider">
              Order
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-[color:var(--color-muted)] underline-offset-4 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm italic text-[color:var(--color-muted)]">
                Tap items to add
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--color-foreground)]/10">
                {cart.map((line) => (
                  <li key={line.cartLineId} className="px-2 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {line.item.name}
                          {line.variant && (
                            <span className="ml-1 text-[color:var(--color-muted)]">
                              · {line.variant.name}
                            </span>
                          )}
                        </div>
                        {line.selectedModifiers.length > 0 && (
                          <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">
                            {line.selectedModifiers
                              .map((m) => m.name)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        {fmt(lineUnitCents(line) * line.quantity)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => adjustQuantity(line.cartLineId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--color-foreground)]/15 text-base hover:bg-[color:var(--color-foreground)]/5"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => adjustQuantity(line.cartLineId, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--color-foreground)]/15 text-base hover:bg-[color:var(--color-foreground)]/5"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-[color:var(--color-foreground)]/10 px-5 py-4">
              {business.tipSuggestions.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                    Tip
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {business.tipSuggestions.map((pct) => (
                      <button
                        key={pct}
                        onClick={() =>
                          setTipPercent(tipPercent === pct ? null : pct)
                        }
                        className={`rounded-md py-1.5 text-xs font-medium ${
                          tipPercent === pct
                            ? "bg-[color:var(--color-accent)] text-white"
                            : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
                        }`}
                      >
                        {Math.round(pct * 100)}%
                      </button>
                    ))}
                    <button
                      onClick={() => setTipPercent(null)}
                      className={`rounded-md py-1.5 text-xs font-medium ${
                        tipPercent === null
                          ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                          : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
                      }`}
                    >
                      None
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-3 flex items-center justify-between text-xs">
                <button
                  onClick={() => setDiscountOpen(true)}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    discount
                      ? "border border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]"
                      : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
                  }`}
                >
                  {discount
                    ? discount.type === "percent"
                      ? `Discount · ${(discount.value * 100).toFixed(0)}%`
                      : `Discount · ${fmt(discount.value)}`
                    : "Add discount"}
                </button>
                {discount && (
                  <button
                    onClick={() => setDiscount(null)}
                    className="text-[color:var(--color-muted)] underline-offset-4 hover:underline"
                  >
                    clear
                  </button>
                )}
              </div>

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Subtotal</dt>
                  <dd>{fmt(subtotalCents)}</dd>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[color:var(--color-muted)]">
                      Discount
                      {discount?.reason && (
                        <span className="ml-1 text-[10px] italic">
                          · {discount.reason}
                        </span>
                      )}
                    </dt>
                    <dd>−{fmt(discountCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Tax</dt>
                  <dd>{fmt(taxCents)}</dd>
                </div>
                {tipCents > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[color:var(--color-muted)]">Tip</dt>
                    <dd>{fmt(tipCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-[color:var(--color-foreground)]/10 pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{fmt(totalCents)}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCharge("cash")}
                  disabled={isCharging}
                  className="rounded-lg border border-[color:var(--color-foreground)]/15 py-3 text-sm font-semibold hover:bg-[color:var(--color-foreground)]/5 disabled:opacity-60"
                >
                  {isCharging ? "…" : `Cash · ${fmt(totalCents)}`}
                </button>
                <button
                  onClick={() => handleCharge("card")}
                  disabled={isCharging || !business.cardPaymentsAvailable}
                  title={
                    business.cardPaymentsAvailable
                      ? undefined
                      : "Set STRIPE_SECRET_KEY in apps/web/.env.local to enable card payments"
                  }
                  className="rounded-lg bg-[color:var(--color-accent)] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                >
                  {isCharging ? "…" : `Card · ${fmt(totalCents)}`}
                </button>
              </div>
              {chargeError && (
                <p className="mt-2 text-center text-xs text-red-600">
                  {chargeError}
                </p>
              )}
              {!business.cardPaymentsAvailable && (
                <p className="mt-2 text-center text-[10px] text-[color:var(--color-muted)]">
                  Card disabled — STRIPE_SECRET_KEY not set
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {configuringItem && (
        <ItemConfigurator
          item={configuringItem}
          onCancel={() => setConfiguringItem(null)}
          onConfirm={(variant, modifiers) =>
            addToCart(configuringItem, variant, modifiers)
          }
        />
      )}

      {startingCashOpen && (
        <StartingCashModal
          slug={business.slug}
          currentCents={shift.startingCashCents}
          onClose={() => setStartingCashOpen(false)}
        />
      )}

      {discountOpen && (
        <DiscountModal
          subtotalCents={subtotalCents}
          current={discount}
          onCancel={() => setDiscountOpen(false)}
          onApply={(d) => {
            setDiscount(d);
            setDiscountOpen(false);
          }}
        />
      )}
    </div>
  );
}

type DiscountState = {
  type: "percent" | "amount";
  value: number;
  reason: string;
};

function DiscountModal({
  subtotalCents,
  current,
  onCancel,
  onApply,
}: {
  subtotalCents: number;
  current: DiscountState | null;
  onCancel: () => void;
  onApply: (d: DiscountState | null) => void;
}) {
  const [mode, setMode] = useState<"percent" | "amount">(
    current?.type ?? "percent",
  );
  const [raw, setRaw] = useState(() => {
    if (!current) return "";
    return current.type === "percent"
      ? (current.value * 100).toString()
      : (current.value / 100).toFixed(2);
  });
  const [reason, setReason] = useState(current?.reason ?? "");
  const [error, setError] = useState<string | null>(null);

  const previewCents = (() => {
    if (raw === "") return 0;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (mode === "percent") {
      return Math.min(Math.round(subtotalCents * (n / 100)), subtotalCents);
    }
    return Math.min(Math.round(n * 100), subtotalCents);
  })();

  function apply() {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setError("Enter a value");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a positive number");
      return;
    }
    if (mode === "percent" && n > 100) {
      setError("Percentage can't exceed 100");
      return;
    }
    onApply({
      type: mode,
      value: mode === "percent" ? n / 100 : Math.round(n * 100),
      reason: reason.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-[color:var(--color-background)] p-6 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Discount
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Applied before tax · max {fmt(subtotalCents)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("percent")}
            className={`rounded-md py-2 text-sm font-semibold ${
              mode === "percent"
                ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
            }`}
          >
            Percent
          </button>
          <button
            onClick={() => setMode("amount")}
            className={`rounded-md py-2 text-sm font-semibold ${
              mode === "amount"
                ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
            }`}
          >
            Dollars
          </button>
        </div>

        {mode === "percent" && (
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[10, 15, 20, 50].map((p) => (
              <button
                key={p}
                onClick={() => setRaw(String(p))}
                className="rounded-md border border-[color:var(--color-foreground)]/15 py-1.5 text-sm hover:bg-[color:var(--color-foreground)]/5"
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            {mode === "percent" ? "Percent" : "Amount"}
          </span>
          <div className="mt-1 flex items-baseline rounded-lg border border-[color:var(--color-foreground)]/15 bg-white/70 px-3">
            {mode === "amount" && (
              <span className="mr-1 text-xl font-medium text-[color:var(--color-muted)]">
                $
              </span>
            )}
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={raw}
              onChange={(e) => {
                setError(null);
                setRaw(e.target.value);
              }}
              placeholder={mode === "percent" ? "10" : "5.00"}
              className="w-full bg-transparent py-2.5 text-2xl font-semibold tabular-nums focus:outline-none"
            />
            {mode === "percent" && (
              <span className="ml-1 text-xl font-medium text-[color:var(--color-muted)]">
                %
              </span>
            )}
          </div>
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Reason (optional)
          </span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="employee, comp, loyalty"
            className="mt-1 block w-full rounded-lg border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </label>

        <div className="mt-4 rounded-md bg-[color:var(--color-foreground)]/5 px-3 py-2 text-sm">
          Preview · subtotal goes from{" "}
          <span className="tabular-nums">{fmt(subtotalCents)}</span> to{" "}
          <span className="font-semibold tabular-nums">
            {fmt(subtotalCents - previewCents)}
          </span>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-between gap-2">
          {current ? (
            <button
              onClick={() => onApply(null)}
              className="rounded-lg border border-[color:var(--color-foreground)]/15 px-4 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
            >
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="rounded-lg bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StartingCashModal({
  slug,
  currentCents,
  onClose,
}: {
  slug: string;
  currentCents: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState(
    currentCents != null ? (currentCents / 100).toFixed(2) : "",
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function presetButton(cents: number) {
    return (
      <button
        key={cents}
        onClick={() => setRaw((cents / 100).toFixed(2))}
        className="rounded-md border border-[color:var(--color-foreground)]/15 px-3 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
      >
        {fmt(cents)}
      </button>
    );
  }

  function save() {
    const parsed = parseDollars(raw);
    if (parsed == null) {
      setError("Enter an amount like 100 or 50.00");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await setShiftStartingCash({ slug, cents: parsed });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-[color:var(--color-background)] p-6 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Starting cash
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          What's in the drawer right now? You can update this later.
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[0, 5000, 10000, 20000].map(presetButton)}
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Amount
          </span>
          <div className="mt-1 flex items-baseline rounded-lg border border-[color:var(--color-foreground)]/15 bg-white/70 px-3">
            <span className="mr-1 text-xl font-medium text-[color:var(--color-muted)]">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={raw}
              onChange={(e) => {
                setError(null);
                setRaw(e.target.value);
              }}
              placeholder="0.00"
              className="w-full bg-transparent py-2.5 text-2xl font-semibold tabular-nums focus:outline-none"
            />
          </div>
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
          >
            Skip
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseDollars(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, "");
  if (trimmed === "") return 0;
  if (!/^\d*(\.\d{0,2})?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function ItemConfigurator({
  item,
  onCancel,
  onConfirm,
}: {
  item: Item;
  onCancel: () => void;
  onConfirm: (variant: Variant | null, modifiers: Modifier[]) => void;
}) {
  const defaultVariant =
    item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null;

  const initialModifiers = item.modifierGroups.flatMap((g) =>
    g.modifiers.filter((m) => m.isDefault)
  );

  const [variant, setVariant] = useState<Variant | null>(defaultVariant);
  const [selectedModifierIds, setSelectedModifierIds] = useState<Set<string>>(
    new Set(initialModifiers.map((m) => m.id))
  );

  function toggleModifier(group: ModifierGroup, mod: Modifier) {
    setSelectedModifierIds((prev) => {
      const next = new Set(prev);
      if (group.selectionType === "single") {
        // Clear other modifiers in this group, set this one
        for (const other of group.modifiers) next.delete(other.id);
        next.add(mod.id);
      } else {
        if (next.has(mod.id)) next.delete(mod.id);
        else next.add(mod.id);
      }
      return next;
    });
  }

  const selectedModifiers = item.modifierGroups
    .flatMap((g) => g.modifiers)
    .filter((m) => selectedModifierIds.has(m.id));

  const previewCents =
    item.basePriceCents +
    (variant?.priceDeltaCents ?? 0) +
    selectedModifiers.reduce((s, m) => s + m.priceDeltaCents, 0);

  const groupSatisfied = (g: ModifierGroup) => {
    if (!g.required) return true;
    return g.modifiers.some((m) => selectedModifierIds.has(m.id));
  };
  const allSatisfied = item.modifierGroups.every(groupSatisfied);

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-[color:var(--color-background)] shadow-2xl sm:rounded-2xl">
        <header className="flex items-baseline justify-between border-b border-[color:var(--color-foreground)]/10 px-6 py-4">
          <div>
            <div className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {item.name}
            </div>
            {item.description && (
              <div className="mt-0.5 text-sm text-[color:var(--color-muted)]">
                {item.description}
              </div>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-2xl leading-none text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {item.variants.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                Size
              </div>
              <div className="flex flex-wrap gap-2">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      variant?.id === v.id
                        ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                        : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
                    }`}
                  >
                    {v.name}
                    {v.priceDeltaCents !== 0 && (
                      <span className="ml-1.5 text-xs opacity-70">
                        {v.priceDeltaCents > 0 ? "+" : ""}
                        {fmt(v.priceDeltaCents)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.modifierGroups.map((group) => (
            <div key={group.id} className="mb-6">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                  {group.name}
                  {group.required && (
                    <span className="ml-1 text-[color:var(--color-accent)]">
                      *
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[color:var(--color-muted)]">
                  {group.selectionType === "single"
                    ? "pick one"
                    : group.maxSelections
                      ? `up to ${group.maxSelections}`
                      : "any"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.modifiers.map((m) => {
                  const selected = selectedModifierIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModifier(group, m)}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        selected
                          ? "bg-[color:var(--color-accent)] text-white"
                          : "border border-[color:var(--color-foreground)]/15 hover:bg-[color:var(--color-foreground)]/5"
                      }`}
                    >
                      {m.name}
                      {m.priceDeltaCents !== 0 && (
                        <span className="ml-1.5 text-xs opacity-80">
                          +{fmt(m.priceDeltaCents)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--color-foreground)]/10 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg px-5 py-3 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5"
          >
            Cancel
          </button>
          <button
            disabled={!allSatisfied}
            onClick={() => onConfirm(variant, selectedModifiers)}
            className="flex-1 rounded-lg bg-[color:var(--color-foreground)] py-3 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-40"
          >
            Add to order · {fmt(previewCents)}
          </button>
        </footer>
      </div>
    </div>
  );
}
