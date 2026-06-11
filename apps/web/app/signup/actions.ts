"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";

export async function createCheckoutSession(formData: FormData) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const priceId = process.env.STRIPE_PRICE_HOSTED;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_HOSTED is not set.");
  }

  const ownerEmail = String(formData.get("email") ?? "").trim();
  const ownerName = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const profile = String(formData.get("profile") ?? "restaurant");

  if (!ownerEmail || !businessName) {
    throw new Error("Email and business name are required.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: ownerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      ownerEmail,
      ownerName,
      businessName,
      businessSlug: businessName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 48),
      profile,
    },
    subscription_data: {
      metadata: { businessName, ownerEmail },
    },
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    allow_promotion_codes: true,
  });

  redirect(session.url! as never);
}
