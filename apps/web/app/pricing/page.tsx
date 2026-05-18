import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — DearPOS",
  description:
    "DearPOS hosted plans starting at $29/mo. No setup fees, no per-transaction cut, cancel anytime.",
};

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 29,
    tagline: "Perfect for a single food truck or pop-up.",
    features: [
      "1 location",
      "1 POS terminal",
      "Up to 500 menu items",
      "Stripe Terminal (Tap to Pay)",
      "Email support",
    ],
    cta: "Get started →",
    highlight: false,
  },
  {
    key: "growth",
    name: "Growth",
    price: 59,
    tagline: "For shops with a second register or location.",
    features: [
      "3 locations",
      "3 POS terminals",
      "Unlimited menu items",
      "Stripe Terminal (Tap to Pay)",
      "Kitchen display support",
      "Priority email support",
    ],
    cta: "Get started →",
    highlight: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: 99,
    tagline: "Multi-location operators and growing restaurants.",
    features: [
      "Unlimited locations",
      "Unlimited POS terminals",
      "Unlimited menu items",
      "Stripe Terminal (Tap to Pay)",
      "Kitchen display support",
      "Multi-location reporting",
      "Dedicated onboarding call",
    ],
    cta: "Get started →",
    highlight: false,
  },
] as const;

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <header className="mb-4 text-center">
        <Link
          href="/"
          className="text-sm text-[color:var(--color-muted)] hover:underline underline-offset-4"
        >
          ← DearPOS
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
          Straightforward pricing
        </h1>
        <p className="mt-4 text-xl text-[color:var(--color-muted)]">
          No setup fees. No per-transaction cut on top of Stripe&rsquo;s 2.7%.
          Cancel anytime.
        </p>
      </header>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={[
              "rounded-xl border p-8 flex flex-col",
              plan.highlight
                ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5 ring-1 ring-[color:var(--color-accent)]"
                : "border-[color:var(--color-foreground)]/10 bg-white/40",
            ].join(" ")}
          >
            {plan.highlight && (
              <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[color:var(--color-accent)]">
                Most popular
              </div>
            )}
            <div className="text-2xl font-semibold">{plan.name}</div>
            <div className="mt-2 text-sm text-[color:var(--color-muted)]">
              {plan.tagline}
            </div>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-[color:var(--color-muted)]">/mo</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-[color:var(--color-accent)]">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/signup?plan=${plan.key}` as never}
              className={[
                "mt-8 rounded-md px-5 py-3 text-center text-sm font-medium transition-opacity hover:opacity-90",
                plan.highlight
                  ? "bg-[color:var(--color-accent)] text-white"
                  : "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]",
              ].join(" ")}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-20 rounded-xl border border-[color:var(--color-foreground)]/10 bg-white/40 p-8">
        <h2 className="text-xl font-semibold">What&rsquo;s included in every plan</h2>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Self-hostable open-source fallback (Apache 2.0)",
            "Stripe Terminal — Tap to Pay on iPhone/Android",
            "Offline-first — orders queue when WiFi drops",
            "PIN-based staff auth + shift reports",
            "Two business profiles: restaurant + café/retail",
            "End-of-day Z-report",
            "Receipt printing (Bluetooth thermal + SMS)",
            "No per-transaction platform fee",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-[color:var(--color-accent)]">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 text-center text-sm text-[color:var(--color-muted)]">
        <p>
          Want to self-host for free?{" "}
          <a
            href="https://github.com/engindearing-projects/dearpos"
            className="underline underline-offset-4"
          >
            Fork it on GitHub →
          </a>
        </p>
        <p className="mt-2">
          Running a nonprofit, school, or mutual aid org?{" "}
          <a
            href="mailto:hi@engindearing.soy?subject=DearPOS%20nonprofit%20pricing"
            className="underline underline-offset-4"
          >
            Email us about free hosting.
          </a>
        </p>
      </section>
    </main>
  );
}
