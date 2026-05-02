import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { startOfBusinessDay } from "@/lib/business-day";
import { KitchenAutoRefresh } from "./auto-refresh";
import { MarkReadyButton, UnbumpButton } from "./ticket-actions";

// Page is dynamic — turn off static caching so each request and each
// router.refresh() hits the DB.
export const dynamic = "force-dynamic";

const STATION_ORDER = ["expo", "grill", "bar", "fryer", "cold"];

export default async function KitchenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const dayStart = startOfBusinessDay(new Date(), business.timezone);
  const recentPreparedCutoff = new Date(Date.now() - 10 * 60 * 1000);

  const orders = await db.order.findMany({
    where: {
      businessId: business.id,
      status: { in: ["paid", "open"] },
      createdAt: { gte: dayStart },
      OR: [
        { preparedAt: null },
        { preparedAt: { gte: recentPreparedCutoff } },
      ],
    },
    include: {
      lines: {
        where: { voided: false },
        include: { item: true, variant: true, modifiers: { include: { modifier: true } } },
        orderBy: { createdAt: "asc" },
      },
      staff: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Filter to orders that have at least one kitchen-station line.
  const kitchenOrders = orders.filter((o) =>
    o.lines.some((l) => l.item.kitchenStation),
  );

  const pending = kitchenOrders.filter((o) => o.preparedAt == null);
  const recent = kitchenOrders.filter((o) => o.preparedAt != null);

  const fmtTime = new Intl.DateTimeFormat("en-US", {
    timeZone: business.timezone,
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-3">
          {business.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="h-10 w-10 rounded-md object-cover"
            />
          )}
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              {business.name} · Kitchen
            </h1>
            <p className="text-xs text-[color:var(--color-muted)]">
              {pending.length} pending · {recent.length} recently bumped
            </p>
          </div>
        </div>
        <KitchenAutoRefresh />
      </header>

      {pending.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-10 text-center text-[color:var(--color-muted)]">
          All clear · waiting on tickets.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pending.map((o) => {
            const ageMs = Date.now() - new Date(o.createdAt).getTime();
            const ageMins = Math.floor(ageMs / 60_000);
            const stationGroups = groupByStation(o.lines);
            return (
              <li
                key={o.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white/70 p-4 shadow-sm ${
                  ageMins >= 8
                    ? "border-rose-300 ring-1 ring-rose-200"
                    : ageMins >= 4
                      ? "border-amber-300"
                      : "border-[color:var(--color-foreground)]/10"
                }`}
              >
                <header className="flex items-baseline justify-between">
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    #{o.number}
                  </span>
                  <span
                    className={`text-xs tabular-nums ${
                      ageMins >= 8
                        ? "font-semibold text-rose-700"
                        : ageMins >= 4
                          ? "text-amber-700"
                          : "text-[color:var(--color-muted)]"
                    }`}
                  >
                    {ageMins === 0
                      ? "just now"
                      : `${ageMins} min${ageMins === 1 ? "" : "s"}`}
                  </span>
                </header>

                <div className="flex flex-wrap items-baseline gap-2 text-xs text-[color:var(--color-muted)]">
                  {o.tableNumber && (
                    <span className="rounded-full bg-[color:var(--color-foreground)]/5 px-2 py-0.5 font-medium">
                      Table {o.tableNumber}
                    </span>
                  )}
                  {o.staff && <span>Server: {o.staff.name}</span>}
                  <span>charged {fmtTime.format(o.closedAt ?? o.createdAt)}</span>
                </div>

                <div className="space-y-3">
                  {stationGroups.map(([station, lines]) => (
                    <section key={station ?? "unstationed"}>
                      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                        {station ?? "other"}
                      </h3>
                      <ul className="space-y-1.5 text-sm">
                        {lines.map((l) => (
                          <li key={l.id} className="leading-snug">
                            <div>
                              <span className="font-semibold tabular-nums">
                                {l.quantity}×
                              </span>{" "}
                              {l.item.name}
                              {l.variant && (
                                <span className="text-[color:var(--color-muted)]">
                                  {" "}
                                  · {l.variant.name}
                                </span>
                              )}
                            </div>
                            {l.modifiers.length > 0 && (
                              <div className="text-xs text-[color:var(--color-muted)]">
                                {l.modifiers
                                  .map((m) => m.modifier.name)
                                  .join(" · ")}
                              </div>
                            )}
                            {l.notes && (
                              <div className="text-xs italic text-[color:var(--color-accent)]">
                                {l.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                {o.notes && (
                  <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                    {o.notes}
                  </p>
                )}

                <MarkReadyButton slug={slug} orderId={o.id} />
              </li>
            );
          })}
        </ul>
      )}

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Recently bumped (last 10 min)
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex items-baseline justify-between rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 px-3 py-2 text-sm opacity-70"
              >
                <span>
                  <span className="font-mono tabular-nums">#{o.number}</span>{" "}
                  <span className="text-xs text-[color:var(--color-muted)]">
                    bumped{" "}
                    {o.preparedAt
                      ? fmtTime.format(o.preparedAt)
                      : "—"}
                  </span>
                </span>
                <UnbumpButton slug={slug} orderId={o.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

type LineWithItem = Awaited<
  ReturnType<typeof loadKitchenOrdersForType>
>[number];

// Helper exists so we can derive the kitchen line type without exporting
// it from the page module.
async function loadKitchenOrdersForType() {
  return [
    {
      id: "",
      quantity: 0,
      notes: null as string | null,
      item: { name: "", kitchenStation: null as string | null },
      variant: null as { name: string } | null,
      modifiers: [] as { modifier: { name: string } }[],
    },
  ];
}

function groupByStation(
  lines: LineWithItem[],
): [string | null, LineWithItem[]][] {
  const buckets = new Map<string | null, LineWithItem[]>();
  for (const line of lines) {
    const key = line.item.kitchenStation ?? null;
    const list = buckets.get(key) ?? [];
    list.push(line);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries()).sort(([a], [b]) => {
    const ai = STATION_ORDER.indexOf(a ?? "");
    const bi = STATION_ORDER.indexOf(b ?? "");
    if (ai === -1 && bi === -1) return (a ?? "").localeCompare(b ?? "");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
