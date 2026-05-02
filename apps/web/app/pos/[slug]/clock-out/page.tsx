import { db } from "@dearpos/db";
import { notFound, redirect } from "next/navigation";
import { fmtMoney } from "@/lib/format";
import { readSession } from "@/lib/session";
import { summarizeShiftCash } from "@/lib/cash-drawer";
import { ClockOutForm } from "./clock-out-form";

export default async function ClockOutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const session = await readSession(slug);
  if (!session || session.businessId !== business.id) {
    redirect(`/pos/${slug}/login` as never);
  }

  const staff = await db.staff.findUnique({ where: { id: session.staffId } });
  if (!staff) redirect(`/pos/${slug}/login` as never);

  const summary = await summarizeShiftCash(session.shiftId);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-[color:var(--color-foreground)]/10 bg-white/70 p-6 shadow-sm">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Clock out · {staff.name}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Count the drawer and record the ending cash.
        </p>

        <dl className="mt-5 space-y-1 rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/50 p-4 text-sm">
          <Row
            label="Starting cash"
            value={
              summary.startingCashCents != null
                ? fmtMoney(summary.startingCashCents / 100)
                : "not set"
            }
            muted={summary.startingCashCents == null}
          />
          <Row
            label="Cash sales this shift"
            value={fmtMoney(summary.cashSalesCents / 100)}
          />
          <Row
            label="Expected in drawer"
            value={
              summary.expectedEndingCashCents != null
                ? fmtMoney(summary.expectedEndingCashCents / 100)
                : "—"
            }
            bold
          />
        </dl>

        <ClockOutForm
          slug={slug}
          expectedEndingCashCents={summary.expectedEndingCashCents}
        />
      </div>
    </main>
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
      className={`flex justify-between ${
        bold
          ? "border-t border-[color:var(--color-foreground)]/10 pt-2 font-semibold"
          : ""
      }`}
    >
      <dt className={muted ? "text-[color:var(--color-muted)]" : ""}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
