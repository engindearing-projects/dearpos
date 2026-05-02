import Stripe from "stripe";

let cached: Stripe | null = null;

// Returns a Stripe client if STRIPE_SECRET_KEY is set, otherwise null.
// Card paths gate themselves on this so the app still runs without keys.
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key);
  return cached;
}

export function stripeIsLive(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.startsWith("sk_live_"));
}

// Whether the checkout page should expose the dev-only "simulate tap" button.
// Lit up in non-production OR when STRIPE_TEST_TERMINAL=1 is explicitly set.
export function allowSimulatedTap(): boolean {
  if (process.env.STRIPE_TEST_TERMINAL === "1") return true;
  return process.env.NODE_ENV !== "production" && !stripeIsLive();
}
