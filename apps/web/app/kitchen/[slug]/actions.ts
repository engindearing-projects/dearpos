"use server";

import { db } from "@dearpos/db";
import { revalidatePath } from "next/cache";

export async function markPrepared(input: {
  slug: string;
  orderId: string;
}) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.order.updateMany({
    where: {
      id: input.orderId,
      businessId: business.id,
      preparedAt: null,
    },
    data: { preparedAt: new Date() },
  });
  revalidatePath(`/kitchen/${input.slug}` as never);
}

export async function unmarkPrepared(input: {
  slug: string;
  orderId: string;
}) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.order.updateMany({
    where: { id: input.orderId, businessId: business.id },
    data: { preparedAt: null },
  });
  revalidatePath(`/kitchen/${input.slug}` as never);
}
