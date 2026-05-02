import Link from "next/link";
import { db } from "@dearpos/db";
import { getProfile } from "@dearpos/core/profiles";

export default async function AdminIndex() {
  const businesses = await db.business.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true } },
      locations: { select: { name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <Link
          href="/"
          className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
        >
          ← DearPOS
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Admin
        </h1>
        <p className="mt-2 text-[color:var(--color-muted)]">
          Pick a business to manage.
        </p>
      </header>

      {businesses.length === 0 ? (
        <p className="text-[color:var(--color-muted)] italic">
          No businesses yet. Run <code className="font-mono text-sm">bun run db:seed</code> to load samples.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-foreground)]/10 rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40">
          {businesses.map((b) => {
            const profile = getProfile(b.profile);
            return (
              <li key={b.id}>
                <Link
                  href={`/admin/${b.slug}` as never}
                  className="flex items-baseline justify-between gap-4 px-5 py-4 hover:bg-[color:var(--color-foreground)]/5"
                >
                  <div>
                    <div className="text-lg font-medium">{b.name}</div>
                    <div className="text-sm text-[color:var(--color-muted)]">
                      {profile.name} · {b.locations[0]?.name ?? "no location"}
                    </div>
                  </div>
                  <div className="text-sm text-[color:var(--color-muted)]">
                    {b._count.items} items →
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
