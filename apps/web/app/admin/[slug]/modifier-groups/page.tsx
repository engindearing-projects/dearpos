import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { fmtMoneyDelta } from "@/lib/format";

export default async function ModifierGroupsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const groups = await db.modifierGroup.findMany({
    where: { businessId: business.id },
    orderBy: [{ name: "asc" }],
    include: {
      modifiers: { orderBy: { sortOrder: "asc" } },
      _count: { select: { itemLinks: true } },
    },
  });

  return (
    <section>
      <header className="mb-6 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Modifier groups</h2>
        <Link
          href={`/admin/${slug}/modifier-groups/new` as never}
          className="rounded-lg bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-semibold text-[color:var(--color-background)] hover:opacity-90"
        >
          + New group
        </Link>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-6 text-[color:var(--color-muted)]">
          No modifier groups yet. Create one (e.g. "Milk" or "Cook
          Temperature") to use across items.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-5"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/admin/${slug}/modifier-groups/${g.id}` as never}
                  className="text-base font-semibold underline-offset-4 hover:underline"
                >
                  {g.name}
                </Link>
                <div className="flex flex-wrap items-baseline gap-3 text-xs text-[color:var(--color-muted)]">
                  <span className="rounded-full bg-[color:var(--color-foreground)]/5 px-2 py-0.5 uppercase tracking-wider">
                    {g.selectionType === "single" ? "pick one" : "pick any"}
                  </span>
                  {g.required && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 uppercase tracking-wider text-amber-900">
                      required
                    </span>
                  )}
                  <span>
                    {g._count.itemLinks} item
                    {g._count.itemLinks === 1 ? "" : "s"}
                  </span>
                </div>
              </header>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {g.modifiers.map((m) => (
                  <li
                    key={m.id}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      m.isDefault
                        ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]"
                        : "border-[color:var(--color-foreground)]/15"
                    }`}
                  >
                    {m.name}
                    {Number(m.priceDelta) !== 0 && (
                      <span className="ml-1 opacity-80">
                        {fmtMoneyDelta(m.priceDelta)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
