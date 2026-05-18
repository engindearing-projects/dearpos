import type { Metadata } from "next";
import Link from "next/link";
import { createCheckoutSession } from "./actions";

export const metadata: Metadata = {
  title: "Start your DearPOS — DearPOS",
  description: "Set up your hosted DearPOS account in under 2 minutes.",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter — $29/mo",
  growth: "Growth — $59/mo",
  pro: "Pro — $99/mo",
};

export default function SignupPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan && PLAN_LABELS[searchParams.plan]
    ? searchParams.plan
    : "starter";

  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <header className="mb-10">
        <Link
          href="/pricing"
          className="text-sm text-[color:var(--color-muted)] hover:underline underline-offset-4"
        >
          ← Back to pricing
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Start your DearPOS
        </h1>
        <p className="mt-3 text-[color:var(--color-muted)]">
          Selected plan:{" "}
          <span className="font-medium text-[color:var(--color-foreground)]">
            {PLAN_LABELS[plan]}
          </span>
          {" · "}
          <Link href="/pricing" className="underline underline-offset-4 text-sm">
            change
          </Link>
        </p>
      </header>

      <form action={createCheckoutSession} className="space-y-5">
        <input type="hidden" name="plan" value={plan} />

        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium mb-1.5"
          >
            Business name
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            placeholder="Spokane Street Tacos"
            className="w-full rounded-md border border-[color:var(--color-foreground)]/20 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
          />
        </div>

        <div>
          <label htmlFor="profile" className="block text-sm font-medium mb-1.5">
            Business type
          </label>
          <select
            id="profile"
            name="profile"
            className="w-full rounded-md border border-[color:var(--color-foreground)]/20 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
          >
            <option value="restaurant">Restaurant / table service</option>
            <option value="cafe-retail">Café / quick-service / retail</option>
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Alex Rivera"
            className="w-full rounded-md border border-[color:var(--color-foreground)]/20 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@yourshop.com"
            className="w-full rounded-md border border-[color:var(--color-foreground)]/20 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
          />
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            Used for your Stripe receipt and to reach you during setup.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[color:var(--color-accent)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity mt-2"
        >
          Continue to payment →
        </button>
      </form>

      <p className="mt-6 text-xs text-[color:var(--color-muted)] text-center">
        You&rsquo;ll be redirected to Stripe to enter your card. Cancel anytime.
        No setup fees.
      </p>
    </main>
  );
}
