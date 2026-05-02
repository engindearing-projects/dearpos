import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { ItemForm } from "../item-form";

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true, profile: true },
  });
  if (!business) notFound();

  const items = await db.item.findMany({
    where: { businessId: business.id },
    select: { category: true },
  });
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is string => !!c)),
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
      <h2 className="mt-2 text-xl font-semibold">New item</h2>

      <ItemForm
        slug={slug}
        mode={{ kind: "create" }}
        categories={categories}
        modifierGroups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          selectionType: g.selectionType,
          required: g.required,
          modifierCount: g._count.modifiers,
        }))}
        initial={{
          name: "",
          description: "",
          category: "",
          basePriceCents: 0,
          taxable: true,
          sku: "",
          barcode: "",
          kitchenStation: "",
          trackInventory: business.profile === "cafe-retail",
          sortOrder: 0,
          variants: [],
          modifierGroupIds: [],
        }}
      />
    </section>
  );
}
