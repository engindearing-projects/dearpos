"use client";

import { useTransition } from "react";
import { markPrepared, unmarkPrepared } from "./actions";

export function MarkReadyButton({
  slug,
  orderId,
}: {
  slug: string;
  orderId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await markPrepared({ slug, orderId });
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed");
          }
        })
      }
      className="w-full rounded-lg bg-emerald-600 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "Bumping…" : "Mark ready"}
    </button>
  );
}

export function UnbumpButton({
  slug,
  orderId,
}: {
  slug: string;
  orderId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await unmarkPrepared({ slug, orderId });
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed");
          }
        })
      }
      className="text-xs text-[color:var(--color-muted)] underline-offset-4 hover:underline disabled:opacity-50"
    >
      undo
    </button>
  );
}
