import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@dearpos/db";
import { fmtMoney } from "@/lib/format";
import { getStripe } from "@/lib/stripe";
import { ReceiptActions } from "./receipt-actions";

const cents = (d: { toString(): string } | number | null | undefined) =>
  d == null ? 0 : Math.round(Number(d.toString()) * 100);

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

  const totalCents = cents(order.total);
  const refundedCents = order.payments.reduce(
    (s, p) => s + cents(p.refundedAmount),
    0,
  );
  const hasCard = order.payments.some((p) => p.method === "card");
  const cardConfigured = Boolean(getStripe());

  const statusBadge = statusBadgeFor(order.status, refundedCents > 0);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div
        data-print-root
        className="rounded-2xl border border-[color:var(--color-foreground)]/10 bg-white/70 p-6 shadow-sm"
      >
        <header className="border-b border-dashed border-[color:var(--color-foreground)]/15 pb-4 text-center">
          {business.logoUrl && (
            <div className="flex justify-center">
              <Image
                src={business.logoUrl}
                alt={`${business.name} logo`}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-md object-cover"
              />
            </div>
          )}
          <div
            className={`font-[family-name:var(--font-display)] text-xl font-semibold ${
              business.logoUrl ? "mt-2" : ""
            }`}
          >
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
          {statusBadge && (
            <div className="mt-3 flex justify-center">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${statusBadge.cls}`}
              >
                {statusBadge.label}
              </span>
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
          {refundedCents > 0 && (
            <Row
              label="Refunded"
              value={`−${fmtMoney(refundedCents / 100)}`}
            />
          )}
          {refundedCents > 0 && (
            <div className="flex justify-between border-t border-[color:var(--color-foreground)]/10 pt-2 text-sm font-semibold">
              <dt>Net to customer</dt>
              <dd className="tabular-nums">
                {fmtMoney((totalCents - refundedCents) / 100)}
              </dd>
            </div>
          )}
        </dl>

        {order.notes && (
          <p className="mt-4 rounded-md bg-[color:var(--color-foreground)]/5 px-3 py-2 text-xs text-[color:var(--color-muted)]">
            {order.notes}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[color:var(--color-muted)]">
          Thanks — see you again soon.
        </p>
      </div>

      <ReceiptActions
        slug={slug}
        orderId={order.id}
        status={order.status}
        totalCents={totalCents}
        refundedCents={refundedCents}
        hasCard={hasCard}
        cardConfigured={cardConfigured}
      />
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

function statusBadgeFor(
  status: string,
  hasRefund: boolean,
): { label: string; cls: string } | null {
  if (status === "voided")
    return {
      label: "Voided",
      cls: "bg-rose-50 text-rose-900 border border-rose-200",
    };
  if (status === "refunded")
    return {
      label: "Refunded",
      cls: "bg-amber-50 text-amber-900 border border-amber-200",
    };
  if (status === "open")
    return {
      label: "Open",
      cls: "bg-amber-50 text-amber-900 border border-amber-200",
    };
  if (hasRefund && status === "paid")
    return {
      label: "Partially refunded",
      cls: "bg-amber-50 text-amber-900 border border-amber-200",
    };
  return null;
}
