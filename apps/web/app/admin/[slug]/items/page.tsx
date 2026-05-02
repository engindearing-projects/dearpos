import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { fmtMoney, fmtMoneyDelta } from "@/lib/format";

export default async function ItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ inactive?: string }>;
}) {
  const { slug } = await params;
  const { inactive } = await searchParams;
  const showInactive = inactive === "1";

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const items = await db.item.findMany({
    where: {
      businessId: business.id,
      ...(showInactive ? {} : { active: true }),
    },
    orderBy: [{ active: "desc" }, { category: "asc" }, { sortOrder: "asc" }],
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      modifierGroups: {
        include: { modifierGroup: { include: { _count: { select: { modifiers: true } } } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const byCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.category ?? "Uncategorized";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Items</h2>
          <Link
            href={
              `/admin/${slug}/items${showInactive ? "" : "?inactive=1"}` as never
            }
            className="text-xs text-[color:var(--color-muted)] underline-offset-4 hover:underline"
          >
            {showInactive ? "Hide inactive" : "Show inactive"}
          </Link>
        </div>
        <Link
          href={`/admin/${slug}/items/new` as never}
          className="rounded-lg bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-semibold text-[color:var(--color-background)] hover:opacity-90"
        >
          + New item
        </Link>
      </header>

      <div className="space-y-8">
        {Object.entries(byCategory).map(([category, list]) => (
          <div key={category}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
              {category}
            </h3>
            <ul className="divide-y divide-[color:var(--color-foreground)]/10 overflow-hidden rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40">
              {list.map((item) => (
                <li key={item.id} className="grid grid-cols-12 gap-3 px-5 py-4">
                  <div className="col-span-7">
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/admin/${slug}/items/${item.id}` as never}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {item.name}
                      </Link>
                      {!item.active && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                          inactive
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div className="mt-0.5 text-sm text-[color:var(--color-muted)]">
                        {item.description}
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.variants.length > 0 && (
                        <span className="rounded-full bg-[color:var(--color-foreground)]/5 px-2 py-0.5 text-xs">
                          {item.variants.length} variant{item.variants.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {item.modifierGroups.map((mg) => (
                        <span
                          key={mg.modifierGroupId}
                          className="rounded-full bg-[color:var(--color-accent)]/10 px-2 py-0.5 text-xs text-[color:var(--color-accent)]"
                        >
                          {mg.modifierGroup.name} ({mg.modifierGroup._count.modifiers})
                        </span>
                      ))}
                      {item.kitchenStation && (
                        <span className="rounded-full bg-[color:var(--color-foreground)]/5 px-2 py-0.5 text-xs uppercase tracking-wide text-[color:var(--color-muted)]">
                          {item.kitchenStation}
                        </span>
                      )}
                      {item.barcode && (
                        <span className="rounded-full bg-[color:var(--color-foreground)]/5 px-2 py-0.5 font-mono text-xs text-[color:var(--color-muted)]">
                          {item.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 self-start text-sm text-[color:var(--color-muted)]">
                    {item.sku && <code className="font-mono">{item.sku}</code>}
                  </div>
                  <div className="col-span-2 self-start text-right">
                    <div className="font-semibold">{fmtMoney(item.basePrice)}</div>
                    {item.variants.some((v) => Number(v.priceDelta) !== 0) && (
                      <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">
                        {item.variants.map((v) => (
                          <span key={v.id} className="ml-1.5">
                            {v.name} {fmtMoneyDelta(v.priceDelta)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
