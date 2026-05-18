"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";

const PLAN_PRICES: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  pro: process.env.STRIPE_PRICE_PRO,
};

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter ($29/mo)",
  growth: "Growth ($59/mo)",
  pro: "Pro ($99/mo)",
};

export async function createCheckoutSession(formData: FormData) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const plan = String(formData.get("plan") ?? "starter");
  const ownerEmail = String(formData.get("email") ?? "").trim();
  const ownerName = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const profile = String(formData.get("profile") ?? "restaurant");

  if (!ownerEmail || !businessName) {
    throw new Error("Email and business name are required.");
  }

  const priceId = PLAN_PRICES[plan];
  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${plan}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: ownerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      plan,
      ownerEmail,
      ownerName,
      businessName,
      // Slugify: lowercase, spaces → hyphens, strip non-alphanumeric
      businessSlug: businessName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 48),
      profile,
    },
    subscription_data: {
      metadata: {
        plan,
        businessName,
        ownerEmail,
      },
    },
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    allow_promotion_codes: true,
  });

  redirect(session.url!);
}
