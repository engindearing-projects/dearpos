"use client";

import { useTransition } from "react";
import { simulateCardSuccess, cancelCardOrder } from "./actions";

export function CheckoutClient({
  slug,
  orderId,
  orderNumber,
  totalLabel,
  paymentIntentId,
  stripeConfigured,
  allowSimulate,
}: {
  slug: string;
  orderId: string;
  orderNumber: number;
  totalLabel: string;
  paymentIntentId: string | null;
  stripeConfigured: boolean;
  allowSimulate: boolean;
}) {
  const [pending, start] = useTransition();

  function call(fn: () => Promise<unknown>) {
    start(async () => {
      try {
        await fn();
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        // eslint-disable-next-line no-alert
        alert(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-[color:var(--color-foreground)]/10 bg-white/70 p-6 text-center shadow-sm">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          Order #{orderNumber}
        </div>
        <div className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
          {totalLabel}
        </div>

        {!stripeConfigured ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            <div className="font-semibold">Stripe is not configured</div>
            <p className="mt-1">
              Set <code className="font-mono">STRIPE_SECRET_KEY</code> in{" "}
              <code className="font-mono">apps/web/.env.local</code> to take card
              payments. Until then, this order is sitting in <em>open</em> state
              and can be cancelled.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-[color:var(--color-foreground)]/10 bg-white/60 px-4 py-3 text-left text-xs text-[color:var(--color-muted)]">
            Tap to Pay reader integration goes here. The PaymentIntent
            <code className="ml-1 font-mono">{paymentIntentId}</code> is waiting
            for the Terminal SDK to confirm. Captures land back at this page.
          </div>
        )}

        {allowSimulate && (
          <button
            disabled={pending}
            onClick={() => call(() => simulateCardSuccess({ slug, orderId }))}
            className="mt-6 w-full rounded-lg bg-[color:var(--color-accent)] py-3 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Working…" : "Simulate successful tap (dev)"}
          </button>
        )}

        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Cancel this order and void the PaymentIntent?")) {
              call(() => cancelCardOrder({ slug, orderId }));
            }
          }}
          className="mt-3 w-full rounded-lg border border-[color:var(--color-foreground)]/15 py-2.5 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5 disabled:opacity-60"
        >
          Cancel order
        </button>
      </div>
    </main>
  );
}
