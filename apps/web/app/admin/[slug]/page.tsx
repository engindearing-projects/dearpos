import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { fmtMoney } from "@/lib/format";

export default async function BusinessOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    include: {
      _count: { select: { items: true, modifierGroups: true, locations: true } },
    },
  });
  if (!business) notFound();

  const stats = [
    { label: "Items", value: business._count.items },
    { label: "Modifier groups", value: business._count.modifierGroups },
    { label: "Locations", value: business._count.locations },
    { label: "Tax rate", value: `${(Number(business.taxRate) * 100).toFixed(2)}%` },
  ];

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-4"
          >
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Today
        </h2>
        <p className="mt-2 text-[color:var(--color-muted)]">
          Order flow is wired up next — once you ring up a sale on the POS, this
          panel will show today&rsquo;s revenue, ticket count, and avg ticket size.
        </p>
      </div>
    </section>
  );
}
