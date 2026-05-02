import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { readSession } from "@/lib/session";

// Stripe Terminal SDK calls this from the client to get a short-lived
// connection token. We require an authenticated POS session so that anonymous
// callers can't mint Stripe Terminal tokens.
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }

  const session = await readSession(body.slug);
  if (!session) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }

  const token = await stripe.terminal.connectionTokens.create();
  return NextResponse.json({ secret: token.secret });
}
