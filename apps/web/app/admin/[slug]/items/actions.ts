"use server";

import { db, Prisma } from "@dearpos/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function createItem(input: ItemFormInput) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.item.create({
    data: {
      businessId: business.id,
      ...clean(input),
    },
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
