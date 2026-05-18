import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're in — DearPOS",
  description: "Your DearPOS account is being set up.",
};

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="mb-6 text-5xl">🎉</div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
        You&rsquo;re in.
      </h1>
      <p className="mt-4 text-lg text-[color:var(--color-muted)]">
        Payment confirmed. We&rsquo;re setting up your DearPOS account now.
      </p>
      <div className="mt-8 rounded-xl border border-[color:var(--color-foreground)]/10 bg-white/40 p-6 text-left space-y-3 text-sm">
        <p>
          <strong>What happens next:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-2 text-[color:var(--color-muted)]">
          <li>We&rsquo;ll email your login link within a few minutes.</li>
          <li>
            Open it on your iPhone or Android — no app install needed, it runs
            in the browser.
          </li>
          <li>
            Tap to Pay is ready immediately with the Stripe account you already
            have (or we&rsquo;ll help you create one free).
          </li>
        </ol>
      </div>
      <p className="mt-8 text-sm text-[color:var(--color-muted)]">
        Questions?{" "}
        <a
          href="mailto:hi@engindearing.soy?subject=DearPOS%20setup"
          className="underline underline-offset-4"
        >
          Email us
        </a>{" "}
        — we reply fast.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm underline underline-offset-4 text-[color:var(--color-muted)]"
      >
        ← Back to DearPOS
      </Link>
    </main>
  );
}
