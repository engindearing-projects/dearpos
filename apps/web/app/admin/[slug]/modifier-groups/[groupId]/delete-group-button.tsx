"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteModifierGroup } from "../actions";

export function DeleteGroupButton({
  slug,
  groupId,
  attachedCount,
}: {
  slug: string;
  groupId: string;
  attachedCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={pending || attachedCount > 0}
        title={
          attachedCount > 0
            ? `Detach from all ${attachedCount} items first`
            : undefined
        }
        onClick={() => {
          if (!confirm("Delete this modifier group? This can't be undone."))
            return;
          setError(null);
          start(async () => {
            try {
              await deleteModifierGroup({ slug, groupId });
              router.push(`/admin/${slug}/modifier-groups` as never);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed");
            }
          });
        }}
        className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Delete group
      </button>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
