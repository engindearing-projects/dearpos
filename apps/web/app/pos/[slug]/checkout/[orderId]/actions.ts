"use server";

import { db } from "@dearpos/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { allowSimulatedTap } from "@/lib/stripe";
import { getProcessor } from "@/lib/payments";
import { readSession } from "@/lib/session";

// Captures the PaymentIntent server-side, marks the Payment succeeded, and
// closes the Order. Used both by real Terminal flows (after the SDK returns
// a captured intent) and by the dev-only simulate-tap button.
async function finalizeCardPayment(slug: string, orderId: string) {
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
  if (order.status === "paid") return order.id;

  const cardPayment = order.payments.find((p) => p.method === "card");
  if (!cardPayment) throw new Error("No card payment on this order");

  await db.$transaction([
    db.payment.update({
      where: { id: cardPayment.id },
      data: { status: "succeeded" },
    }),
    db.order.update({
      where: { id: order.id },
      data: { status: "paid", closedAt: new Date() },
    }),
  ]);

  revalidatePath(`/admin/${slug}` as never);
  return order.id;
}

export async function simulateCardSuccess(input: {
  slug: string;
  orderId: string;
}) {
  if (!allowSimulatedTap()) {
    throw new Error("Simulated tap is disabled in production");
  }
  const id = await finalizeCardPayment(input.slug, input.orderId);
  redirect(`/pos/${input.slug}/receipt/${id}` as never);
}

// Capture an actual PaymentIntent the Terminal SDK has confirmed.
// The Terminal flow on the client should have status === "requires_capture"
// or "succeeded" by the time we get here.
export async function captureCardPayment(input: {
  slug: string;
  orderId: string;
  paymentIntentId: string;
}) {
  const processor = getProcessor();
  if (!processor.isConfigured()) {
    throw new Error(`Processor '${processor.id}' is not configured`);
  }

  const session = await readSession(input.slug);
  const business = await db.business.findUnique({ where: { slug: input.slug } });
  if (!business) throw new Error("Business not found");
  if (!session || session.businessId !== business.id) {
    throw new Error("Not signed in");
  }

  const payment = await db.payment.findFirst({
    where: {
      stripePaymentIntentId: input.paymentIntentId,
      orderId: input.orderId,
    },
  });
  if (!payment) throw new Error("Payment not found for this intent");

  const captured = await processor.capture({
    ref: { processor: processor.id, intentId: input.paymentIntentId },
  });

  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: "succeeded",
        stripeChargeId: captured.ref.chargeId ?? null,
      },
    }),
    db.order.update({
      where: { id: input.orderId },
      data: { status: "paid", closedAt: new Date() },
    }),
  ]);

  // v0.2 plug: emit OrderClosed here so InventoryComponent deductions run
  // on the closed order regardless of which processor handled the card.

  revalidatePath(`/admin/${input.slug}` as never);
  redirect(`/pos/${input.slug}/receipt/${input.orderId}` as never);
}

export async function cancelCardOrder(input: {
  slug: string;
  orderId: string;
}) {
  const session = await readSession(input.slug);
  const business = await db.business.findUnique({ where: { slug: input.slug } });
  if (!business) throw new Error("Business not found");
  if (!session || session.businessId !== business.id) {
    throw new Error("Not signed in");
  }

  const order = await db.order.findFirst({
    where: { id: input.orderId, businessId: business.id },
    include: { payments: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.status === "paid") {
    throw new Error("Order is already paid; refund instead");
  }

  // Best-effort cancel via the processor. If it's gone or the intent is
  // already terminal, we still void the local order.
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
  redirect(`/pos/${input.slug}` as never);
}
