"use client";

import { useTransition } from "react";
import { setItemActive } from "../actions";

export function ItemActiveToggle({
  slug,
  itemId,
  active,
}: {
  slug: string;
  itemId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() => {
        const next = !active;
        const verb = next ? "reactivate" : "deactivate";
        if (!confirm(`Are you sure you want to ${verb} this item?`)) return;
        start(async () => {
          try {
            await setItemActive({ slug, itemId, active: next });
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        active
          ? "border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100"
          : "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      } disabled:opacity-50`}
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
