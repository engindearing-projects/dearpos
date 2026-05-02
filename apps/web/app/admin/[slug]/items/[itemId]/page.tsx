import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { ItemForm } from "../item-form";
import { ItemActiveToggle } from "./active-toggle";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!business) notFound();

  const item = await db.item.findFirst({
    where: { id: itemId, businessId: business.id },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      modifierGroups: {
        orderBy: { sortOrder: "asc" },
        select: { modifierGroupId: true },
      },
    },
  });
  if (!item) notFound();

  const others = await db.item.findMany({
    where: { businessId: business.id },
    select: { category: true },
  });
  const categories = Array.from(
    new Set(others.map((i) => i.category).filter((c): c is string => !!c)),
  ).sort();

  const groups = await db.modifierGroup.findMany({
    where: { businessId: business.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { modifiers: true } } },
  });

  return (
    <section>
      <Link
        href={`/admin/${slug}/items` as never}
        className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
      >
        ← Items
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{item.name}</h2>
          <p className="text-xs text-[color:var(--color-muted)]">
            {item.active ? "Active" : "Inactive"} · added{" "}
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
        <ItemActiveToggle slug={slug} itemId={item.id} active={item.active} />
      </header>

      <div className="mt-6">
        <ItemForm
          slug={slug}
          mode={{ kind: "edit", itemId: item.id }}
          categories={categories}
          modifierGroups={groups.map((g) => ({
            id: g.id,
            name: g.name,
            selectionType: g.selectionType,
            required: g.required,
            modifierCount: g._count.modifiers,
          }))}
          initial={{
            name: item.name,
            description: item.description ?? "",
            category: item.category ?? "",
            basePriceCents: Math.round(Number(item.basePrice) * 100),
            taxable: item.taxable,
            sku: item.sku ?? "",
            barcode: item.barcode ?? "",
            kitchenStation: item.kitchenStation ?? "",
            trackInventory: item.trackInventory,
            sortOrder: item.sortOrder,
            variants: item.variants.map((v) => ({
              id: v.id,
              name: v.name,
              priceDeltaCents: Math.round(Number(v.priceDelta) * 100),
              isDefault: v.isDefault,
              sortOrder: v.sortOrder,
              sku: v.sku ?? "",
            })),
            modifierGroupIds: item.modifierGroups.map((mg) => mg.modifierGroupId),
          }}
        />
      </div>
    </section>
  );
}
