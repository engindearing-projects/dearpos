"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { refundOrder, voidAndReturnToPOS } from "./actions";

const fmt = (cents: number) =>
  `${cents < 0 ? "−" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;

type Props = {
  slug: string;
  orderId: string;
  status: string;
  totalCents: number;
  refundedCents: number;
  hasCard: boolean;
  cardConfigured: boolean;
};

export function ReceiptActions(props: Props) {
  const [pending, start] = useTransition();
  const [refundOpen, setRefundOpen] = useState(false);

  const remaining = props.totalCents - props.refundedCents;

  function call(fn: () => Promise<unknown>, onError?: (msg: string) => void) {
    start(async () => {
      try {
        await fn();
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        const msg = err instanceof Error ? err.message : "Something went wrong";
        if (onError) onError(msg);
        else alert(msg);
      }
    });
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/pos/${props.slug}` as never}
          className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] hover:opacity-90"
        >
          New order
        </Link>
        <Link
          href={`/admin/${props.slug}` as never}
          className="rounded-lg border border-[color:var(--color-foreground)]/15 px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5"
        >
          Admin
        </Link>

        {props.status === "open" && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Void this order? It cannot be reopened.")) {
                call(() =>
                  voidAndReturnToPOS({
                    slug: props.slug,
                    orderId: props.orderId,
                  }),
                );
              }
            }}
            className="rounded-lg border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-60"
          >
            Void order
          </button>
        )}

        {(props.status === "paid" || props.status === "refunded") &&
          remaining > 0 && (
            <button
              disabled={pending}
              onClick={() => setRefundOpen(true)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Refund
            </button>
          )}
      </div>

      {refundOpen && (
        <RefundModal
          {...props}
          remainingCents={remaining}
          onClose={() => setRefundOpen(false)}
        />
      )}
    </>
  );
}

function RefundModal({
  slug,
  orderId,
  totalCents,
  remainingCents,
  hasCard,
  cardConfigured,
  onClose,
}: Props & { remainingCents: number; onClose: () => void }) {
  const [raw, setRaw] = useState((remainingCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cents = parseDollars(raw);
  const overLimit = cents != null && cents > remainingCents;

  function submit() {
    if (cents == null) {
      setError("Enter a refund amount, e.g. 5.00");
      return;
    }
    if (cents <= 0) {
      setError("Refund must be positive");
      return;
    }
    if (overLimit) {
      setError(`Max refundable is ${fmt(remainingCents)}`);
      return;
    }
    setError(null);
    start(async () => {
      try {
        const trimmed = reason.trim();
        await refundOrder(
          trimmed
            ? { slug, orderId, amountCents: cents, reason: trimmed }
            : { slug, orderId, amountCents: cents },
        );
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refund failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-[color:var(--color-background)] p-6 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Refund
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Original total {fmt(totalCents)} · refundable {fmt(remainingCents)}
        </p>

        {hasCard && !cardConfigured && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Card refunds need <code className="font-mono">STRIPE_SECRET_KEY</code>{" "}
            in <code className="font-mono">apps/web/.env.local</code>.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setRaw((remainingCents / 100).toFixed(2))}
            className="rounded-md border border-[color:var(--color-foreground)]/15 px-3 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
          >
            Full · {fmt(remainingCents)}
          </button>
          <button
            onClick={() => setRaw((Math.round(remainingCents / 2) / 100).toFixed(2))}
            className="rounded-md border border-[color:var(--color-foreground)]/15 px-3 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
          >
            Half
          </button>
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
              className="w-full bg-transparent py-2.5 text-2xl font-semibold tabular-nums focus:outline-none"
            />
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
            placeholder="e.g. wrong order, comp"
            className="mt-1 block w-full rounded-lg border border-[color:var(--color-foreground)]/15 bg-white/70 px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-[color:var(--color-foreground)]/5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={pending || cents == null || cents <= 0 || overLimit}
            className="rounded-lg bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Refunding…" : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseDollars(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, "");
  if (trimmed === "") return null;
  if (!/^\d*(\.\d{0,2})?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
