export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <header className="mb-12">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
          DearPOS
        </h1>
        <p className="mt-4 text-2xl text-[color:var(--color-muted)] italic">
          Yeah, it&rsquo;s a POS. Just not the way you mean it.
        </p>
      </header>

      <section className="space-y-6 text-lg leading-relaxed">
        <p>
          Open-source point-of-sale for the small shops, cafés, and restaurants tired
          of paying Square 2.6% to rent software they&rsquo;ll never own.
        </p>
        <p>
          Self-hostable. Hardware-optional. Stripe Terminal with Tap to Pay on the iPhone
          or Android in your pocket — no card reader required to start.
        </p>
        <p>
          Built in Spokane by{" "}
          <a
            href="https://engindearing.soy"
            className="underline decoration-[color:var(--color-accent)] underline-offset-4"
          >
            Engindearing
          </a>
          .
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Status</h2>
        <p className="mt-2 text-[color:var(--color-muted)]">
          v0.1 in active development as of May 2026. Not production-ready yet — but
          we&rsquo;re picking the first ten Spokane shops to onboard personally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://github.com/engindearing-projects/dearpos"
            className="rounded-md bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-medium text-[color:var(--color-background)] hover:opacity-90"
          >
            View on GitHub →
          </a>
          <a
            href="mailto:hi@engindearing.soy?subject=DearPOS%20pilot"
            className="rounded-md border border-[color:var(--color-foreground)]/20 px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5"
          >
            Email about a pilot
          </a>
        </div>
      </section>

      <footer className="mt-24 border-t border-[color:var(--color-foreground)]/10 pt-6 text-sm text-[color:var(--color-muted)]">
        Apache-2.0 · An{" "}
        <a href="https://engindearing.soy" className="underline">
          Engindearing
        </a>{" "}
        project
      </footer>
    </main>
  );
}
