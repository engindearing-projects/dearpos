import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/format";
import { startOfBusinessDay } from "@/lib/business-day";

export default async function BusinessOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    include: {
      _count: { select: { items: true, modifierGroups: true, locations: true } },
    },
  });
  if (!business) notFound();

  const dayStart = startOfBusinessDay(new Date(), business.timezone);
  const todaysOrders = await db.order.findMany({
    where: {
      businessId: business.id,
      status: { not: "voided" },
      createdAt: { gte: dayStart },
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lines: true } },
      payments: { select: { method: true } },
    },
  });

  const grossCents = todaysOrders.reduce(
    (s, o) => s + Math.round(Number(o.total) * 100),
    0,
  );
  const tipsCents = todaysOrders.reduce(
    (s, o) => s + Math.round(Number(o.tip) * 100),
    0,
  );
  const ticketCount = todaysOrders.length;
  const avgTicketCents =
    ticketCount > 0 ? Math.round(grossCents / ticketCount) : 0;

  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: business.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const catalogStats = [
    { label: "Items", value: business._count.items },
    { label: "Modifier groups", value: business._count.modifierGroups },
    { label: "Locations", value: business._count.locations },
    {
      label: "Tax rate",
      value: `${(Number(business.taxRate) * 100).toFixed(2)}%`,
    },
  ];

  return (
    <section className="space-y-8">
      <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/60 p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Today · {dayLabel}
          </h2>
          {ticketCount > 0 && (
            <span className="text-xs text-[color:var(--color-muted)]">
              business-local · resets at midnight {business.timezone}
            </span>
          )}
        </header>

        {ticketCount === 0 ? (
          <p className="text-[color:var(--color-muted)]">
            No sales yet today.{" "}
            <Link
              href={`/pos/${slug}` as never}
              className="underline decoration-[color:var(--color-accent)] underline-offset-4"
            >
              Open POS →
            </Link>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Gross" value={fmtMoney(grossCents / 100)} />
              <Stat label="Tickets" value={ticketCount} />
              <Stat label="Avg ticket" value={fmtMoney(avgTicketCents / 100)} />
              <Stat label="Tips" value={fmtMoney(tipsCents / 100)} />
            </div>

            <ul className="mt-6 divide-y divide-[color:var(--color-foreground)]/10">
              {todaysOrders.slice(0, 8).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <Link
                    href={`/pos/${slug}/receipt/${o.id}` as never}
                    className="flex flex-1 items-baseline gap-3 hover:underline"
                  >
                    <span className="font-mono tabular-nums text-[color:var(--color-muted)]">
                      #{o.number}
                    </span>
                    <span>
                      {o._count.lines} item{o._count.lines === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs text-[color:var(--color-muted)]">
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: business.timezone,
                        timeStyle: "short",
                      }).format(o.closedAt ?? o.createdAt)}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                      {o.payments.map((p) => p.method).join(", ") || "—"}
                    </span>
                  </Link>
                  <span className="font-medium tabular-nums">
                    {fmtMoney(o.total)}
                  </span>
                </li>
              ))}
            </ul>
            {ticketCount > 8 && (
              <div className="mt-3 text-xs text-[color:var(--color-muted)]">
                + {ticketCount - 8} more
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Catalog
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {catalogStats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-4"
            >
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
        {label}
      </div>
    </div>
  );
}
