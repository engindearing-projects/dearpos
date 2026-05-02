import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/format";
import {
  businessDayYMD,
  startOfBusinessDayFromYMD,
} from "@/lib/business-day";
import { summarizeShiftCash } from "@/lib/cash-drawer";

const cents = (d: { toString(): string } | number | null | undefined) =>
  d == null ? 0 : Math.round(Number(d.toString()) * 100);

type Search = { date?: string };

export default async function ZReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const today = businessDayYMD(new Date(), business.timezone);
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : today;

  const dayStart = startOfBusinessDayFromYMD(ymd, business.timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const shifts = await db.shift.findMany({
    where: {
      businessId: business.id,
      clockIn: { gte: dayStart, lt: dayEnd },
    },
    include: { staff: true },
    orderBy: { clockIn: "asc" },
  });
  const shiftSummaries = await Promise.all(
    shifts.map(async (s) => ({
      shift: s,
      summary: await summarizeShiftCash(s.id),
    })),
  );

  const orders = await db.order.findMany({
    where: {
      businessId: business.id,
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    include: {
      lines: { include: { item: true } },
      payments: true,
      staff: true,
    },
    orderBy: { number: "asc" },
  });

  const live = orders.filter(
    (o) => o.status === "paid" || o.status === "refunded",
  );
  const voided = orders.filter((o) => o.status === "voided");
  const openCount = orders.filter((o) => o.status === "open").length;

  const grossCents = live.reduce((s, o) => s + cents(o.subtotal), 0);
  const discountCents = live.reduce((s, o) => s + cents(o.discount), 0);
  const taxCents = live.reduce((s, o) => s + cents(o.tax), 0);
  const tipCents = live.reduce((s, o) => s + cents(o.tip), 0);
  const totalCents = live.reduce((s, o) => s + cents(o.total), 0);

  const refundedCents = live.reduce(
    (s, o) =>
      s + o.payments.reduce((ss, p) => ss + cents(p.refundedAmount), 0),
    0,
  );

  // Buckets — payment amounts net of refunds.
  const byPayment = new Map<
    string,
    { count: number; amountCents: number }
  >();
  for (const o of live) {
    for (const p of o.payments) {
      if (p.status === "failed") continue;
      const b = byPayment.get(p.method) ?? { count: 0, amountCents: 0 };
      b.count += 1;
      b.amountCents += cents(p.amount) - cents(p.refundedAmount);
      byPayment.set(p.method, b);
    }
  }

  const byStaff = new Map<
    string,
    { name: string; orders: number; grossCents: number; tipCents: number }
  >();
  for (const o of live) {
    const key = o.staff?.id ?? "—";
    const name = o.staff?.name ?? "(unassigned)";
    const b = byStaff.get(key) ?? {
      name,
      orders: 0,
      grossCents: 0,
      tipCents: 0,
    };
    b.orders += 1;
    b.grossCents += cents(o.subtotal);
    b.tipCents += cents(o.tip);
    byStaff.set(key, b);
  }

  const byCategory = new Map<
    string,
    { qty: number; grossCents: number }
  >();
  for (const o of live) {
    for (const ln of o.lines) {
      if (ln.voided) continue;
      const cat = ln.item.category ?? "Uncategorized";
      const b = byCategory.get(cat) ?? { qty: 0, grossCents: 0 };
      b.qty += ln.quantity;
      b.grossCents += cents(ln.lineTotal);
      byCategory.set(cat, b);
    }
  }

  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: business.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dayStart);

  const generatedAt = new Intl.DateTimeFormat("en-US", {
    timeZone: business.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // Adjacent day links
  const prev = ymdAdd(ymd, -1);
  const next = ymdAdd(ymd, 1);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Z-report · {dayLabel}
          </h2>
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            Generated {generatedAt} · {business.timezone}
          </p>
        </div>

        <form className="flex items-center gap-2 text-sm">
          <Link
            href={`/admin/${slug}/z-report?date=${prev}` as never}
            className="rounded-md border border-[color:var(--color-foreground)]/15 px-2 py-1 hover:bg-[color:var(--color-foreground)]/5"
          >
            ←
          </Link>
          <input
            type="date"
            name="date"
            defaultValue={ymd}
            max={today}
            className="rounded-md border border-[color:var(--color-foreground)]/15 bg-white/60 px-2 py-1"
          />
          <button
            type="submit"
            className="rounded-md border border-[color:var(--color-foreground)]/15 px-2.5 py-1 hover:bg-[color:var(--color-foreground)]/5"
          >
            Go
          </button>
          {ymd !== today && (
            <Link
              href={`/admin/${slug}/z-report` as never}
              className="text-xs text-[color:var(--color-muted)] underline-offset-4 hover:underline"
            >
              today
            </Link>
          )}
          <Link
            href={
              `/admin/${slug}/z-report${next <= today ? `?date=${next}` : ""}` as never
            }
            aria-disabled={next > today}
            className={`rounded-md border border-[color:var(--color-foreground)]/15 px-2 py-1 hover:bg-[color:var(--color-foreground)]/5 ${
              next > today ? "pointer-events-none opacity-40" : ""
            }`}
          >
            →
          </Link>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-6 text-[color:var(--color-muted)]">
          No orders on this day.
        </p>
      ) : (
        <>
          <Card title="Sales">
            <Row label="Gross sales" value={fmtMoney(grossCents / 100)} />
            <Row
              label="Discounts"
              value={discountCents > 0 ? `−${fmtMoney(discountCents / 100)}` : "—"}
              muted={discountCents === 0}
            />
            <Row
              label="Net sales"
              value={fmtMoney((grossCents - discountCents) / 100)}
              bold
            />
            <Row label="Tax collected" value={fmtMoney(taxCents / 100)} />
            <Row label="Tips" value={fmtMoney(tipCents / 100)} />
            <Row label="Charged" value={fmtMoney(totalCents / 100)} />
            {refundedCents > 0 && (
              <Row
                label="Refunds"
                value={`−${fmtMoney(refundedCents / 100)}`}
              />
            )}
            <Row
              label="Net received"
              value={fmtMoney((totalCents - refundedCents) / 100)}
              bold
            />
          </Card>

          <Card title="Tickets">
            <Row label="Tickets closed" value={String(live.length)} />
            <Row label="Voided" value={String(voided.length)} />
            {openCount > 0 && (
              <Row
                label="Open (uncaptured)"
                value={String(openCount)}
                muted
              />
            )}
            <Row
              label="Avg ticket"
              value={
                live.length > 0
                  ? fmtMoney(totalCents / 100 / live.length)
                  : "—"
              }
            />
          </Card>

          <Card title="By payment method">
            {Array.from(byPayment.entries())
              .sort((a, b) => b[1].amountCents - a[1].amountCents)
              .map(([method, b]) => (
                <Row
                  key={method}
                  label={`${method} · ${b.count}`}
                  value={fmtMoney(b.amountCents / 100)}
                />
              ))}
            {byPayment.size === 0 && (
              <p className="text-sm text-[color:var(--color-muted)]">
                No payments recorded.
              </p>
            )}
          </Card>

          <Card title="By staff">
            {Array.from(byStaff.values())
              .sort((a, b) => b.grossCents - a.grossCents)
              .map((s) => (
                <div
                  key={s.name}
                  className="flex justify-between py-1.5 text-sm"
                >
                  <div className="flex-1">{s.name}</div>
                  <div className="w-20 text-right tabular-nums text-[color:var(--color-muted)]">
                    {s.orders}
                  </div>
                  <div className="w-28 text-right tabular-nums">
                    {fmtMoney(s.grossCents / 100)}
                  </div>
                  <div className="w-24 text-right tabular-nums text-[color:var(--color-muted)]">
                    {s.tipCents > 0 ? fmtMoney(s.tipCents / 100) : "—"}
                  </div>
                </div>
              ))}
            <div className="mt-2 flex justify-between border-t border-[color:var(--color-foreground)]/10 pt-2 text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
              <div className="flex-1">Staff</div>
              <div className="w-20 text-right">Tickets</div>
              <div className="w-28 text-right">Gross</div>
              <div className="w-24 text-right">Tips</div>
            </div>
          </Card>

          <Card title="By category">
            {Array.from(byCategory.entries())
              .sort((a, b) => b[1].grossCents - a[1].grossCents)
              .map(([cat, b]) => (
                <div
                  key={cat}
                  className="flex justify-between py-1.5 text-sm"
                >
                  <div className="flex-1">{cat}</div>
                  <div className="w-20 text-right tabular-nums text-[color:var(--color-muted)]">
                    {b.qty} sold
                  </div>
                  <div className="w-28 text-right tabular-nums">
                    {fmtMoney(b.grossCents / 100)}
                  </div>
                </div>
              ))}
          </Card>

          {shiftSummaries.length > 0 && (
            <Card title="Cash drawer">
              {shiftSummaries.map(({ shift: s, summary }) => {
                const v = summary.varianceCents;
                return (
                  <div
                    key={s.id}
                    className="border-b border-[color:var(--color-foreground)]/10 py-3 text-sm last:border-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-medium">
                        {s.staff.name}
                        <span className="ml-2 text-xs text-[color:var(--color-muted)]">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: business.timezone,
                            timeStyle: "short",
                          }).format(s.clockIn)}
                          {" → "}
                          {s.clockOut
                            ? new Intl.DateTimeFormat("en-US", {
                                timeZone: business.timezone,
                                timeStyle: "short",
                              }).format(s.clockOut)
                            : "open"}
                        </span>
                      </div>
                      {v !== null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                            v === 0
                              ? "bg-emerald-50 text-emerald-900"
                              : v > 0
                                ? "bg-amber-50 text-amber-900"
                                : "bg-rose-50 text-rose-900"
                          }`}
                        >
                          {v === 0
                            ? "matches"
                            : `${v > 0 ? "+" : "−"}${fmtMoney(Math.abs(v) / 100)}`}
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 grid grid-cols-4 gap-2 text-xs">
                      <Cell
                        label="Start"
                        value={
                          summary.startingCashCents != null
                            ? fmtMoney(summary.startingCashCents / 100)
                            : "—"
                        }
                      />
                      <Cell
                        label="Cash sales"
                        value={fmtMoney(summary.cashSalesCents / 100)}
                      />
                      <Cell
                        label="Expected"
                        value={
                          summary.expectedEndingCashCents != null
                            ? fmtMoney(summary.expectedEndingCashCents / 100)
                            : "—"
                        }
                      />
                      <Cell
                        label="Counted"
                        value={
                          summary.endingCashCents != null
                            ? fmtMoney(summary.endingCashCents / 100)
                            : s.clockOut
                              ? "not counted"
                              : "still open"
                        }
                        muted={summary.endingCashCents == null}
                      />
                    </dl>
                  </div>
                );
              })}
            </Card>
          )}

          {voided.length > 0 && (
            <Card title="Voids">
              {voided.map((o) => (
                <div
                  key={o.id}
                  className="flex justify-between py-1 text-sm text-[color:var(--color-muted)]"
                >
                  <span>
                    #{o.number} · {o.staff?.name ?? "(unassigned)"}
                  </span>
                  <span className="tabular-nums">{fmtMoney(o.total)}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/50 p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
        {title}
      </h3>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  bold = false,
  muted = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-0.5 text-sm ${
        bold ? "border-t border-[color:var(--color-foreground)]/10 pt-2 font-semibold" : ""
      }`}
    >
      <dt className={muted ? "text-[color:var(--color-muted)]" : ""}>
        {label}
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Cell({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
        {label}
      </div>
      <div
        className={`mt-0.5 tabular-nums ${
          muted ? "text-[color:var(--color-muted)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ymdAdd(ymd: string, days: number): string {
  const [yStr, mStr, dStr] = ymd.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
