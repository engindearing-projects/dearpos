"use server";

import { db, Prisma } from "@dearpos/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type VariantInput = {
  id?: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
  sortOrder: number;
  sku?: string;
};

export type ItemFormInput = {
  slug: string;
  name: string;
  description: string;
  category: string;
  basePriceCents: number;
  taxable: boolean;
  sku: string;
  barcode: string;
  kitchenStation: string;
  trackInventory: boolean;
  sortOrder: number;
  variants: VariantInput[];
  modifierGroupIds: string[];
};

const dec = (cents: number) => new Prisma.Decimal(cents).div(100);

function clean(input: ItemFormInput) {
  if (!input.name.trim()) throw new Error("Name is required");
  if (
    !Number.isFinite(input.basePriceCents) ||
    input.basePriceCents < 0
  ) {
    throw new Error("Price must be ≥ 0");
  }
  for (const v of input.variants) {
    if (!v.name.trim()) throw new Error("Each variant needs a name");
    if (!Number.isFinite(v.priceDeltaCents)) {
      throw new Error("Variant price delta must be a number");
    }
  }
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    category: input.category.trim() || null,
    basePrice: dec(Math.round(input.basePriceCents)),
    taxable: input.taxable,
    sku: input.sku.trim() || null,
    barcode: input.barcode.trim() || null,
    kitchenStation: input.kitchenStation.trim() || null,
    trackInventory: input.trackInventory,
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  };
}

async function syncRelations(input: {
  itemId: string;
  businessId: string;
  variants: VariantInput[];
  modifierGroupIds: string[];
}) {
  // Variants
  const existing = await db.variant.findMany({
    where: { itemId: input.itemId },
  });
  const incomingIds = new Set(
    input.variants.map((v) => v.id).filter((id): id is string => !!id),
  );
  const toDelete = existing
    .filter((v) => !incomingIds.has(v.id))
    .map((v) => v.id);

  // Modifier groups — only attach groups owned by the same business.
  const ownedGroups = await db.modifierGroup.findMany({
    where: {
      id: { in: input.modifierGroupIds },
      businessId: input.businessId,
    },
    select: { id: true },
  });
  const validGroupIds = new Set(ownedGroups.map((g) => g.id));

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (toDelete.length > 0) {
    ops.push(db.variant.deleteMany({ where: { id: { in: toDelete } } }));
  }
  for (const [idx, v] of input.variants.entries()) {
    if (v.id) {
      ops.push(
        db.variant.update({
          where: { id: v.id },
          data: {
            name: v.name.trim(),
            priceDelta: dec(Math.round(v.priceDeltaCents)),
            isDefault: v.isDefault,
            sortOrder: idx,
            sku: v.sku?.trim() || null,
          },
        }),
      );
    } else {
      ops.push(
        db.variant.create({
          data: {
            itemId: input.itemId,
            name: v.name.trim(),
            priceDelta: dec(Math.round(v.priceDeltaCents)),
            isDefault: v.isDefault,
            sortOrder: idx,
            sku: v.sku?.trim() || null,
          },
        }),
      );
    }
  }

  // Replace the modifier-group join rows wholesale.
  ops.push(db.itemModifierGroup.deleteMany({ where: { itemId: input.itemId } }));
  for (const [idx, gid] of input.modifierGroupIds.entries()) {
    if (!validGroupIds.has(gid)) continue;
    ops.push(
      db.itemModifierGroup.create({
        data: { itemId: input.itemId, modifierGroupId: gid, sortOrder: idx },
      }),
    );
  }

  await db.$transaction(ops);
}

export async function createItem(input: ItemFormInput) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  const created = await db.item.create({
    data: {
      businessId: business.id,
      ...clean(input),
    },
  });

  await syncRelations({
    itemId: created.id,
    businessId: business.id,
    variants: input.variants,
    modifierGroupIds: input.modifierGroupIds,
  });

  revalidatePath(`/admin/${input.slug}/items` as never);
  redirect(`/admin/${input.slug}/items` as never);
}

export async function updateItem(input: ItemFormInput & { itemId: string }) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  const owned = await db.item.count({
    where: { id: input.itemId, businessId: business.id },
  });
  if (!owned) throw new Error("Item not found");

  await db.item.update({
    where: { id: input.itemId },
    data: clean(input),
  });

  await syncRelations({
    itemId: input.itemId,
    businessId: business.id,
    variants: input.variants,
    modifierGroupIds: input.modifierGroupIds,
  });

  revalidatePath(`/admin/${input.slug}/items` as never);
  redirect(`/admin/${input.slug}/items` as never);
}

export async function setItemActive(input: {
  slug: string;
  itemId: string;
  active: boolean;
}) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.item.updateMany({
    where: { id: input.itemId, businessId: business.id },
    data: { active: input.active },
  });
  revalidatePath(`/admin/${input.slug}/items` as never);
}
