"use server";

import { db, hashPin } from "@dearpos/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ROLES = ["owner", "manager", "cashier", "server"] as const;
type Role = (typeof ROLES)[number];

function validatePin(pin: string) {
  if (!/^\d{3,8}$/.test(pin)) {
    throw new Error("PIN must be 3 to 8 digits");
  }
}

function validateRole(role: string): asserts role is Role {
  if (!ROLES.includes(role as Role)) {
    throw new Error(`Role must be one of: ${ROLES.join(", ")}`);
  }
}

export async function createStaff(input: {
  slug: string;
  name: string;
  role: string;
  pin: string;
}) {
  if (!input.name.trim()) throw new Error("Name is required");
  validateRole(input.role);
  validatePin(input.pin);

  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  // Reactivate an existing staff with the same name rather than failing on
  // the (businessId, name) unique constraint.
  const existing = await db.staff.findFirst({
    where: { businessId: business.id, name: input.name.trim() },
  });

  if (existing) {
    await db.staff.update({
      where: { id: existing.id },
      data: {
        active: true,
        role: input.role,
        pinHash: hashPin(input.pin),
      },
    });
  } else {
    await db.staff.create({
      data: {
        businessId: business.id,
        name: input.name.trim(),
        role: input.role,
        pinHash: hashPin(input.pin),
      },
    });
  }

  revalidatePath(`/admin/${input.slug}/staff` as never);
  redirect(`/admin/${input.slug}/staff` as never);
}

export async function updateStaff(input: {
  slug: string;
  staffId: string;
  name: string;
  role: string;
}) {
  if (!input.name.trim()) throw new Error("Name is required");
  validateRole(input.role);

  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.staff.updateMany({
    where: { id: input.staffId, businessId: business.id },
    data: { name: input.name.trim(), role: input.role },
  });
  revalidatePath(`/admin/${input.slug}/staff` as never);
  redirect(`/admin/${input.slug}/staff` as never);
}

export async function resetStaffPin(input: {
  slug: string;
  staffId: string;
  pin: string;
}) {
  validatePin(input.pin);
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.staff.updateMany({
    where: { id: input.staffId, businessId: business.id },
    data: { pinHash: hashPin(input.pin) },
  });
  revalidatePath(`/admin/${input.slug}/staff` as never);
}

export async function setStaffActive(input: {
  slug: string;
  staffId: string;
  active: boolean;
}) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  if (!input.active) {
    // Don't lock the business out — refuse to deactivate the last owner.
    const staff = await db.staff.findFirst({
      where: { id: input.staffId, businessId: business.id },
    });
    if (!staff) return;
    if (staff.role === "owner") {
      const otherOwners = await db.staff.count({
        where: {
          businessId: business.id,
          role: "owner",
          active: true,
          NOT: { id: staff.id },
        },
      });
      if (otherOwners === 0) {
        throw new Error("Can't deactivate the last active owner");
      }
    }
  }

  await db.staff.updateMany({
    where: { id: input.staffId, businessId: business.id },
    data: { active: input.active },
  });
  revalidatePath(`/admin/${input.slug}/staff` as never);
}
