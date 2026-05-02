import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/format";
import {
  businessDayYMD,
  startOfBusinessDayFromYMD,
} from "@/lib/business-day";

const cents = (d: { toString(): string } | number | null | undefined) =>
  d == null ? 0 : Math.round(Number(d.toString()) * 100);

type Search = {
  date?: string;
  status?: string;
  q?: string;
};

const STATUS_OPTIONS = [
  { id: "", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "open", label: "Open" },
  { id: "voided", label: "Voided" },
  { id: "refunded", label: "Refunded" },
];

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const search = await searchParams;

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const today = businessDayYMD(new Date(), business.timezone);
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(search.date ?? "")
    ? search.date!
    : today;
  const status = search.status ?? "";
  const q = (search.q ?? "").trim();

  const dayStart = startOfBusinessDayFromYMD(ymd, business.timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const numberQuery =
    q && /^#?\d+$/.test(q) ? Number(q.replace(/^#/, "")) : null;

  const orders = await db.order.findMany({
    where: {
      businessId: business.id,
      ...(numberQuery == null
        ? { createdAt: { gte: dayStart, lt: dayEnd } }
        : { number: numberQuery }),
      ...(status ? { status } : {}),
    },
    include: {
      payments: { select: { method: true, refundedAmount: true } },
      staff: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  const fmtTime = new Intl.DateTimeFormat("en-US", {
    timeZone: business.timezone,
    timeStyle: "short",
  });

  return (
    <section>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            {numberQuery != null
              ? `Searching ticket #${numberQuery}`
              : `${ymd} · ${business.timezone}`}
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            name="date"
            defaultValue={ymd}
            max={today}
            className="rounded-md border border-[color:var(--color-foreground)]/15 bg-white/60 px-2 py-1"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-[color:var(--color-foreground)]/15 bg-white/60 px-2 py-1"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="#42"
            className="w-20 rounded-md border border-[color:var(--color-foreground)]/15 bg-white/60 px-2 py-1"
          />
          <button
            type="submit"
            className="rounded-md border border-[color:var(--color-foreground)]/15 px-2.5 py-1 hover:bg-[color:var(--color-foreground)]/5"
          >
            Filter
          </button>
        </form>
      </header>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-6 text-[color:var(--color-muted)]">
          No orders match.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-foreground)]/10 overflow-hidden rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40">
          {orders.map((o) => {
            const refundedCents = o.payments.reduce(
              (s, p) => s + cents(p.refundedAmount),
              0,
            );
            const methods = Array.from(
              new Set(o.payments.map((p) => p.method)),
            ).join(", ");
            return (
              <li key={o.id}>
                <Link
                  href={`/pos/${slug}/receipt/${o.id}` as never}
                  className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-[color:var(--color-foreground)]/5"
                >
                  <span className="col-span-1 self-center font-mono tabular-nums text-[color:var(--color-muted)]">
                    #{o.number}
                  </span>
                  <span className="col-span-2 self-center text-xs text-[color:var(--color-muted)]">
                    {fmtTime.format(o.closedAt ?? o.createdAt)}
                  </span>
                  <span className="col-span-2 self-center text-sm">
                    {o.staff?.name ?? "—"}
                  </span>
                  <span className="col-span-2 self-center text-xs text-[color:var(--color-muted)]">
                    {o._count.lines} item
                    {o._count.lines === 1 ? "" : "s"}
                  </span>
                  <span className="col-span-2 self-center text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                    {methods || "—"}
                  </span>
                  <span className="col-span-1 self-center">
                    <StatusPill status={o.status} hasRefund={refundedCents > 0} />
                  </span>
                  <span className="col-span-2 self-center text-right font-medium tabular-nums">
                    {fmtMoney(o.total)}
                    {refundedCents > 0 && (
                      <span className="ml-1 text-xs text-amber-700">
                        −{fmtMoney(refundedCents / 100)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {orders.length === 200 && (
        <p className="mt-3 text-xs text-[color:var(--color-muted)]">
          Showing the most recent 200. Narrow the filters to dig deeper.
        </p>
      )}
    </section>
  );
}

function StatusPill({
  status,
  hasRefund,
}: {
  status: string;
  hasRefund: boolean;
}) {
  const cls = (() => {
    if (status === "voided")
      return "bg-rose-50 text-rose-900 border-rose-200";
    if (status === "refunded")
      return "bg-amber-50 text-amber-900 border-amber-200";
    if (status === "open")
      return "bg-amber-50 text-amber-900 border-amber-200";
    if (hasRefund)
      return "bg-amber-50 text-amber-900 border-amber-200";
    if (status === "paid")
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    return "bg-[color:var(--color-foreground)]/5 text-[color:var(--color-muted)]";
  })();
  const label = hasRefund && status === "paid" ? "partial" : status;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}
