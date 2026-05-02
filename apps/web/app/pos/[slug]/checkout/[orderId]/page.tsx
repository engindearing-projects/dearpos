import { db } from "@dearpos/db";
import { notFound, redirect } from "next/navigation";
import { fmtMoney } from "@/lib/format";
import { allowSimulatedTap, getStripe } from "@/lib/stripe";
import { readSession } from "@/lib/session";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;

  const session = await readSession(slug);
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();
  if (!session || session.businessId !== business.id) {
    redirect(`/pos/${slug}/login` as never);
  }

  const order = await db.order.findFirst({
    where: { id: orderId, businessId: business.id },
    include: { payments: true },
  });
  if (!order) notFound();
  if (order.status === "paid") {
    redirect(`/pos/${slug}/receipt/${order.id}` as never);
  }

  const cardPayment = order.payments.find((p) => p.method === "card");
  const intentId = cardPayment?.stripePaymentIntentId ?? null;

  return (
    <CheckoutClient
      slug={slug}
      orderId={order.id}
      orderNumber={order.number}
      totalLabel={fmtMoney(order.total)}
      paymentIntentId={intentId}
      stripeConfigured={Boolean(getStripe())}
      allowSimulate={allowSimulatedTap()}
    />
  );
}
