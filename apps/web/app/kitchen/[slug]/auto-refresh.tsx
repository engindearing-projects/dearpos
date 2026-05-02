"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Polls the server every `intervalMs` so freshly-charged tickets show up
// without a hard refresh. Pause toggle lets the kitchen freeze the view
// when investigating a specific ticket.
export function KitchenAutoRefresh({
  intervalMs = 5000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [paused, router, intervalMs]);

  return (
    <button
      onClick={() => setPaused((p) => !p)}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        paused
          ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      }`}
    >
      {paused ? "Auto-refresh: paused" : `Auto-refresh: ${intervalMs / 1000}s`}
    </button>
  );
}
