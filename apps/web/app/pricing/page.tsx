import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — DearPOS",
  description:
    "Self-host DearPOS free forever, or let us run it for you at $29/mo. No setup fees, no per-transaction cut on top of Stripe's 2.7%.",
};

const SELF_HOST_FEATURES = [
  "Full source code (Apache 2.0)",
  "Stripe Terminal — Tap to Pay",
  "Restaurant + café/retail profiles",
  "Offline-first — works when WiFi dies",
  "End-of-day Z-reports",
  "Runs on any VPS or Fly.io free tier",
];

const HOSTED_FEATURES = [
  "Everything in self-host",
  "Zero server setup — live in minutes",
  "Managed Postgres, backups, deploys",
  "We handle Stripe Terminal config",
  "Email support from the builders",
  "Updates happen automatically",
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <header className="mb-4 text-center">
        <Link
          href="/"
          className="text-sm text-[color:var(--color-muted)] hover:underline underline-offset-4"
        >
          ← DearPOS
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
          Simple pricing
        </h1>
        <p className="mt-4 text-xl text-[color:var(--color-muted)]">
          Own it yourself, or let us run it. No contracts, no platform cut on card revenue.
        </p>
      </header>

      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {/* Self-host */}
        <div className="rounded-xl border border-[color:var(--color-foreground)]/10 bg-white/40 p-8 flex flex-col">
          <div className="text-2xl font-semibold">Self-host</div>
          <div className="mt-2 text-sm text-[color:var(--color-muted)]">
            Run it on your own server. Full control, forever free.
          </div>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-[color:var(--color-muted)]">/forever</span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {SELF_HOST_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-[color:var(--color-muted)]">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a
            href="https://github.com/engindearing-projects/dearpos"
            className="mt-8 rounded-md border border-[color:var(--color-foreground)]/20 px-5 py-3 text-center text-sm font-medium hover:bg-[color:var(--color-foreground)]/5 transition-colors"
          >
            View on GitHub →
          </a>
        </div>

        {/* Hosted */}
        <div className="rounded-xl border border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5 ring-1 ring-[color:var(--color-accent)] p-8 flex flex-col">
          <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[color:var(--color-accent)]">
            We run it for you
          </div>
          <div className="text-2xl font-semibold">Hosted</div>
          <div className="mt-2 text-sm text-[color:var(--color-muted)]">
            One-click setup, no servers to manage. Ready in minutes.
          </div>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-bold">$29</span>
            <span className="text-[color:var(--color-muted)]">/mo</span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {HOSTED_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-[color:var(--color-accent)]">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href={"/signup" as never}
            className="mt-8 rounded-md bg-[color:var(--color-accent)] px-5 py-3 text-center text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Get started →
          </Link>
        </div>
      </div>

      <section className="mt-16 text-center space-y-2 text-sm text-[color:var(--color-muted)]">
        <p>
          Stripe Terminal 2.7% + $0.05 per tap/swipe — same rate whether you
          self-host or use the hosted tier. We take no cut of your card revenue.
        </p>
        <p>
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
