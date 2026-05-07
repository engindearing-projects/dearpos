"use server";

import { db, Prisma } from "@dearpos/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { getProcessor } from "@/lib/payments";

const dec = (cents: number) => new Prisma.Decimal(cents).div(100);

const cents = (d: { toString(): string } | number | null | undefined) =>
  d == null ? 0 : Math.round(Number(d.toString()) * 100);

async function loadOrder(slug: string, orderId: string) {
  const session = await readSession(slug);
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) throw new Error("Business not found");
  if (!session || session.businessId !== business.id) {
    throw new Error("Not signed in");
  }
  const order = await db.order.findFirst({
    where: { id: orderId, businessId: business.id },
    include: { payments: true },
  });
  if (!order) throw new Error("Order not found");
  return { order, business };
}

export async function voidOrder(input: { slug: string; orderId: string }) {
  const { order } = await loadOrder(input.slug, input.orderId);

  if (order.status === "voided") return;
  if (order.status === "paid" || order.status === "refunded") {
    throw new Error("Paid orders must be refunded, not voided");
  }

  const processor = getProcessor();
  for (const p of order.payments) {
    if (p.method !== "card" || !p.stripePaymentIntentId) continue;
    await processor.cancel({
      ref: { processor: processor.id, intentId: p.stripePaymentIntentId },
    });
  }

  await db.$transaction([
    db.payment.updateMany({
      where: { orderId: order.id, status: "pending" },
      data: { status: "failed" },
    }),
    db.order.update({
      where: { id: order.id },
      data: { status: "voided", closedAt: new Date() },
    }),
  ]);

  revalidatePath(`/admin/${input.slug}` as never);
  revalidatePath(`/pos/${input.slug}/receipt/${order.id}` as never);
}

export async function refundOrder(input: {
  slug: string;
  orderId: string;
  amountCents: number;
  reason?: string;
}) {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Refund amount must be positive");
  }

  const { order } = await loadOrder(input.slug, input.orderId);
  if (order.status !== "paid" && order.status !== "refunded") {
    throw new Error("Only paid orders can be refunded");
  }

  const totalCents = cents(order.total);
  const alreadyRefunded = order.payments.reduce(
    (s, p) => s + cents(p.refundedAmount),
    0,
  );
  const remaining = totalCents - alreadyRefunded;
  if (input.amountCents > remaining) {
    throw new Error(
      `Refund exceeds remaining (${remaining} cents available)`,
    );
  }

  // Allocate the refund across payments oldest first. In v0.1 there is one
  // payment per order, but the loop is here so split-tender works later.
  let toRefund = input.amountCents;
  const updates: Promise<unknown>[] = [];
  const processor = getProcessor();

  const payments = [...order.payments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  for (const p of payments) {
    if (toRefund <= 0) break;
    if (p.status !== "succeeded") continue;
    const refundable = cents(p.amount) - cents(p.refundedAmount);
    if (refundable <= 0) continue;

    const slice = Math.min(toRefund, refundable);

    if (p.method === "card") {
      if (!processor.isConfigured()) {
        throw new Error(
          `Card refunds require the '${processor.id}' processor to be configured`,
        );
      }
      if (!p.stripePaymentIntentId) {
        throw new Error("Card payment is missing a processor reference");
      }
      await processor.refund({
        ref: { processor: processor.id, intentId: p.stripePaymentIntentId },
        amountCents: slice,
        ...(input.reason ? { reason: input.reason } : {}),
      });
    }

    updates.push(
      db.payment.update({
        where: { id: p.id },
        data: {
          refundedAmount: dec(cents(p.refundedAmount) + slice),
          status: cents(p.amount) === cents(p.refundedAmount) + slice
            ? "refunded"
            : p.status,
        },
      }),
    );

    toRefund -= slice;
  }

  if (toRefund > 0) {
    throw new Error("Could not allocate the full refund");
  }

  const fullyRefunded = alreadyRefunded + input.amountCents >= totalCents;
  updates.push(
    db.order.update({
      where: { id: order.id },
      data: {
        status: fullyRefunded ? "refunded" : "paid",
        notes: input.reason
          ? [order.notes, `refund: ${input.reason}`].filter(Boolean).join(" · ")
          : order.notes,
      },
    }),
  );

  await db.$transaction(updates as Prisma.PrismaPromise<unknown>[]);

  revalidatePath(`/admin/${input.slug}` as never);
  revalidatePath(`/pos/${input.slug}/receipt/${order.id}` as never);
}

export async function voidAndReturnToPOS(input: {
  slug: string;
  orderId: string;
}) {
  await voidOrder(input);
  redirect(`/pos/${input.slug}` as never);
}
