import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { GroupForm } from "../group-form";
import { DeleteGroupButton } from "./delete-group-button";

export default async function EditModifierGroupPage({
  params,
}: {
  params: Promise<{ slug: string; groupId: string }>;
}) {
  const { slug, groupId } = await params;

  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!business) notFound();

  const group = await db.modifierGroup.findFirst({
    where: { id: groupId, businessId: business.id },
    include: {
      modifiers: { orderBy: { sortOrder: "asc" } },
      _count: { select: { itemLinks: true } },
    },
  });
  if (!group) notFound();

  return (
    <section>
      <Link
        href={`/admin/${slug}/modifier-groups` as never}
        className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
      >
        ← Modifier groups
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{group.name}</h2>
          <p className="text-xs text-[color:var(--color-muted)]">
            Attached to {group._count.itemLinks} item
            {group._count.itemLinks === 1 ? "" : "s"}
          </p>
        </div>
        <DeleteGroupButton
          slug={slug}
          groupId={group.id}
          attachedCount={group._count.itemLinks}
        />
      </header>

      <div className="mt-6">
        <GroupForm
          slug={slug}
          mode={{ kind: "edit", groupId: group.id }}
          initial={{
            name: group.name,
            selectionType: group.selectionType as "single" | "multiple",
            required: group.required,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            modifiers: group.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              priceDeltaCents: Math.round(Number(m.priceDelta) * 100),
              isDefault: m.isDefault,
              sortOrder: m.sortOrder,
            })),
          }}
        />
      </div>
    </section>
  );
}
