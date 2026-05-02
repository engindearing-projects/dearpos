import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@dearpos/db";
import { fmtMoney } from "@/lib/format";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const order = await db.order.findFirst({
    where: { id: orderId, businessId: business.id },
    include: {
      lines: {
        include: {
          item: true,
          variant: true,
          modifiers: { include: { modifier: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      payments: { orderBy: { createdAt: "asc" } },
      location: true,
      staff: true,
    },
  });
  if (!order) notFound();

  const closedAt = order.closedAt ?? order.createdAt;
  const dt = new Intl.DateTimeFormat("en-US", {
    timeZone: business.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(closedAt);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-2xl border border-[color:var(--color-foreground)]/10 bg-white/70 p-6 shadow-sm">
        <header className="border-b border-dashed border-[color:var(--color-foreground)]/15 pb-4 text-center">
          <div className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {business.name}
          </div>
          {order.location && (
            <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">
              {order.location.name}
            </div>
          )}
          <div className="mt-3 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            Order #{order.number} · {dt}
          </div>
          {order.staff && (
            <div className="mt-1 text-xs text-[color:var(--color-muted)]">
              Served by {order.staff.name}
            </div>
          )}
        </header>

        <ul className="my-4 space-y-3 text-sm">
          {order.lines.map((line) => (
            <li key={line.id}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium">
                    {line.quantity > 1 && (
                      <span className="mr-1.5 text-[color:var(--color-muted)]">
                        {line.quantity}×
                      </span>
                    )}
                    {line.item.name}
                    {line.variant && (
                      <span className="ml-1 text-[color:var(--color-muted)]">
                        · {line.variant.name}
                      </span>
                    )}
                  </div>
                  {line.modifiers.length > 0 && (
                    <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">
                      {line.modifiers.map((m) => m.modifier.name).join(", ")}
                    </div>
                  )}
                </div>
                <div className="font-medium tabular-nums">
                  {fmtMoney(line.lineTotal)}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-dashed border-[color:var(--color-foreground)]/15 pt-3 text-sm">
          <Row label="Subtotal" value={fmtMoney(order.subtotal)} />
          {Number(order.discount) !== 0 && (
            <Row label="Discount" value={`−${fmtMoney(order.discount)}`} />
          )}
          <Row label="Tax" value={fmtMoney(order.tax)} />
          {Number(order.tip) !== 0 && (
            <Row label="Tip" value={fmtMoney(order.tip)} />
          )}
          <div className="flex justify-between border-t border-[color:var(--color-foreground)]/15 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{fmtMoney(order.total)}</dd>
          </div>
          {order.payments.map((p) => (
            <Row
              key={p.id}
              label={`Paid · ${p.method}`}
              value={fmtMoney(p.amount)}
              muted
            />
          ))}
        </dl>

        <p className="mt-6 text-center text-xs text-[color:var(--color-muted)]">
          Thanks — see you again soon.
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href={`/pos/${slug}` as never}
          className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] hover:opacity-90"
        >
          New order
        </Link>
        <Link
          href={`/admin/${slug}` as never}
          className="rounded-lg border border-[color:var(--color-foreground)]/15 px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-[color:var(--color-muted)]" : ""}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
