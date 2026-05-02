import { db } from "@dearpos/db";

const cents = (d: { toString(): string } | number | null | undefined) =>
  d == null ? 0 : Math.round(Number(d.toString()) * 100);

export type ShiftCashSummary = {
  shiftId: string;
  startingCashCents: number | null;
  endingCashCents: number | null;
  cashSalesCents: number;
  expectedEndingCashCents: number | null;
  varianceCents: number | null;
};

// Computes expected cash for the drawer given a shift's starting amount and
// every cash payment recorded against orders rang up on that shift.
export async function summarizeShiftCash(
  shiftId: string,
): Promise<ShiftCashSummary> {
  const shift = await db.shift.findUniqueOrThrow({
    where: { id: shiftId },
  });

  // Cash payments tied to orders this staff member rang up between clockIn and
  // clockOut (or now, if still open). Refunded cash is netted out.
  const closedAt = shift.clockOut ?? new Date();
  const orders = await db.order.findMany({
    where: {
      businessId: shift.businessId,
      staffId: shift.staffId,
      status: { not: "voided" },
      createdAt: { gte: shift.clockIn, lte: closedAt },
    },
    include: { payments: { where: { method: "cash", status: "succeeded" } } },
  });
  const cashSalesCents = orders.reduce(
    (sum, o) =>
      sum +
      o.payments.reduce(
        (s, p) => s + cents(p.amount) - cents(p.refundedAmount),
        0,
      ),
    0,
  );

  const startingCashCents =
    shift.startingCash != null ? cents(shift.startingCash) : null;
  const endingCashCents =
    shift.endingCash != null ? cents(shift.endingCash) : null;
  const expectedEndingCashCents =
    startingCashCents != null ? startingCashCents + cashSalesCents : null;
  const varianceCents =
    endingCashCents != null && expectedEndingCashCents != null
      ? endingCashCents - expectedEndingCashCents
      : null;

  return {
    shiftId: shift.id,
    startingCashCents,
    endingCashCents,
    cashSalesCents,
    expectedEndingCashCents,
    varianceCents,
  };
}
