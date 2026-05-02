"use client";

import { useState, useTransition } from "react";
import { setStaffActive } from "../actions";

export function StaffActiveToggle({
  slug,
  staffId,
  active,
}: {
  slug: string;
  staffId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() => {
          const next = !active;
          const verb = next ? "reactivate" : "deactivate";
          if (!confirm(`Are you sure you want to ${verb} this staff member?`))
            return;
          setError(null);
          start(async () => {
            try {
              await setStaffActive({ slug, staffId, active: next });
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Could not update",
              );
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
      {error && (
        <p className="mt-2 text-xs text-rose-700">{error}</p>
      )}
    </div>
  );
}
