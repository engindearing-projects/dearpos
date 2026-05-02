"use server";

import { db, Prisma } from "@dearpos/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ModifierInput = {
  // existing modifier id, or undefined for a new one
  id?: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
  sortOrder: number;
};

export type GroupInput = {
  name: string;
  selectionType: "single" | "multiple";
  required: boolean;
  minSelections: number;
  maxSelections: number | null;
  modifiers: ModifierInput[];
};

const dec = (cents: number) => new Prisma.Decimal(cents).div(100);

function validateGroup(input: GroupInput) {
  if (!input.name.trim()) throw new Error("Group name is required");
  if (input.selectionType !== "single" && input.selectionType !== "multiple") {
    throw new Error("Selection type must be single or multiple");
  }
  if (input.modifiers.length === 0) {
    throw new Error("Add at least one modifier");
  }
  for (const m of input.modifiers) {
    if (!m.name.trim()) throw new Error("Each modifier needs a name");
    if (!Number.isFinite(m.priceDeltaCents)) {
      throw new Error("Modifier price delta must be a number");
    }
  }
  if (
    input.maxSelections != null &&
    input.maxSelections < input.minSelections
  ) {
    throw new Error("Max selections can't be less than min");
  }
}

export async function createModifierGroup(input: {
  slug: string;
  group: GroupInput;
}) {
  validateGroup(input.group);
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.modifierGroup.create({
    data: {
      businessId: business.id,
      name: input.group.name.trim(),
      selectionType: input.group.selectionType,
      required: input.group.required,
      minSelections: input.group.minSelections,
      maxSelections: input.group.maxSelections,
      modifiers: {
        create: input.group.modifiers.map((m, idx) => ({
          name: m.name.trim(),
          priceDelta: dec(Math.round(m.priceDeltaCents)),
          isDefault: m.isDefault,
          sortOrder: Number.isFinite(m.sortOrder) ? m.sortOrder : idx,
        })),
      },
    },
  });

  revalidatePath(`/admin/${input.slug}/modifier-groups` as never);
  redirect(`/admin/${input.slug}/modifier-groups` as never);
}

export async function updateModifierGroup(input: {
  slug: string;
  groupId: string;
  group: GroupInput;
}) {
  validateGroup(input.group);
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  const existing = await db.modifierGroup.findFirst({
    where: { id: input.groupId, businessId: business.id },
    include: { modifiers: true },
  });
  if (!existing) throw new Error("Group not found");

  const incomingIds = new Set(
    input.group.modifiers.map((m) => m.id).filter((id): id is string => !!id),
  );
  const toDelete = existing.modifiers
    .filter((m) => !incomingIds.has(m.id))
    .map((m) => m.id);

  await db.$transaction([
    db.modifierGroup.update({
      where: { id: input.groupId },
      data: {
        name: input.group.name.trim(),
        selectionType: input.group.selectionType,
        required: input.group.required,
        minSelections: input.group.minSelections,
        maxSelections: input.group.maxSelections,
      },
    }),
    ...(toDelete.length > 0
      ? [db.modifier.deleteMany({ where: { id: { in: toDelete } } })]
      : []),
    ...input.group.modifiers.map((m, idx) =>
      m.id
        ? db.modifier.update({
            where: { id: m.id },
            data: {
              name: m.name.trim(),
              priceDelta: dec(Math.round(m.priceDeltaCents)),
              isDefault: m.isDefault,
              sortOrder: Number.isFinite(m.sortOrder) ? m.sortOrder : idx,
            },
          })
        : db.modifier.create({
            data: {
              modifierGroupId: input.groupId,
              name: m.name.trim(),
              priceDelta: dec(Math.round(m.priceDeltaCents)),
              isDefault: m.isDefault,
              sortOrder: Number.isFinite(m.sortOrder) ? m.sortOrder : idx,
            },
          }),
    ),
  ]);

  revalidatePath(`/admin/${input.slug}/modifier-groups` as never);
  redirect(`/admin/${input.slug}/modifier-groups` as never);
}

export async function deleteModifierGroup(input: {
  slug: string;
  groupId: string;
}) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  const linkedItems = await db.itemModifierGroup.count({
    where: { modifierGroupId: input.groupId },
  });
  if (linkedItems > 0) {
    throw new Error(
      `Group is attached to ${linkedItems} item${linkedItems === 1 ? "" : "s"}; detach first`,
    );
  }

  await db.modifierGroup.deleteMany({
    where: { id: input.groupId, businessId: business.id },
  });
  revalidatePath(`/admin/${input.slug}/modifier-groups` as never);
}
