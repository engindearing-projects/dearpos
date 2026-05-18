import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db, hashPin } from "@dearpos/db";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: `webhook_sig_failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.subscription) return;

  const meta = session.metadata ?? {};
  const plan = meta.plan ?? "starter";
  const ownerEmail = meta.ownerEmail ?? (session.customer_email ?? "");
  const ownerName = meta.ownerName ?? "";
  const businessName = meta.businessName ?? ownerEmail;
  const profile = meta.profile ?? "restaurant";

  let businessSlug = meta.businessSlug ?? slugify(businessName);
  const existing = await db.business.findUnique({ where: { slug: businessSlug } });
  if (existing) {
    businessSlug = `${businessSlug}-${Date.now().toString(36)}`;
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? "");

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as { id: string })?.id ?? "";

  // Idempotency: skip if already processed
  const alreadyExists = await db.hostedSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (alreadyExists) return;

  // Retrieve subscription for price ID and status
  const stripeSub = await getStripe()!.subscriptions.retrieve(stripeSubscriptionId);
  const stripePriceId = stripeSub.items.data[0]?.price.id ?? "";

  // Provision the Business tenant
  const business = await db.business.create({
    data: {
      slug: businessSlug,
      name: businessName,
      profile,
      locations: {
        create: { name: "Main" },
      },
      staff: {
        create: {
          name: ownerName || "Owner",
          pinHash: await hashPin("1234"),
          role: "owner",
        },
      },
    },
  });

  await db.hostedSubscription.create({
    data: {
      businessId: business.id,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      plan,
      status: stripeSub.status,
      ownerEmail,
      ownerName,
      businessName,
      businessSlug,
      profile,
    },
  });

  console.log(`[webhook] provisioned business: ${business.slug} (${plan})`);
  // TODO: send welcome email via Resend/Postmark with login URL
}

// Stripe v22: invoice.subscription moved to invoice.parent.subscription_details.subscription
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent as
    | {
        type: string;
        subscription_details?: { subscription?: string | { id: string } | null } | null;
      }
    | null
    | undefined;

  const sub = parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subId = getSubscriptionIdFromInvoice(invoice);
  if (!subId) return;

  await db.hostedSubscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: {
      status: "active",
      ...(invoice.period_end
        ? { currentPeriodEnd: new Date(invoice.period_end * 1000) }
        : {}),
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = getSubscriptionIdFromInvoice(invoice);
  if (!subId) return;

  await db.hostedSubscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "past_due" },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await db.hostedSubscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price.id;
  const plan = priceIdToPlan(priceId ?? "");

  await db.hostedSubscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: sub.status,
      ...(priceId ? { stripePriceId: priceId } : {}),
      ...(plan ? { plan } : {}),
      ...(sub.canceled_at ? { canceledAt: new Date(sub.canceled_at * 1000) } : {}),
    },
  });
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 48) || "business"
  );
}

function priceIdToPlan(priceId: string): string | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
