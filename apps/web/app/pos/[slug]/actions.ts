"use server";

import { db, Prisma } from "@dearpos/db";
import { computeTotals } from "@dearpos/core";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { startOfBusinessDay } from "@/lib/business-day";

export type CartLineInput = {
  itemId: string;
  variantId: string | null;
  modifierIds: string[];
  quantity: number;
};

export type CreateOrderInput = {
  businessSlug: string;
  lines: CartLineInput[];
  tipCents: number;
  paymentMethod: "cash";
};

const dec = (cents: number) => new Prisma.Decimal(cents).div(100);

export async function createOrder(input: CreateOrderInput) {
  if (input.lines.length === 0) throw new Error("Cart is empty");
  if (input.lines.some((l) => l.quantity <= 0)) {
    throw new Error("All lines must have positive quantity");
  }

  const business = await db.business.findUnique({
    where: { slug: input.businessSlug },
    include: { locations: { take: 1 } },
  });
  if (!business) throw new Error("Business not found");

  // Re-fetch every item the cart references so prices come from the DB,
  // not the client. The client value is hint-only.
  const items = await db.item.findMany({
    where: {
      id: { in: Array.from(new Set(input.lines.map((l) => l.itemId))) },
      businessId: business.id,
    },
    include: {
      variants: true,
      modifierGroups: {
        include: {
          modifierGroup: { include: { modifiers: true } },
        },
      },
    },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));

  type Row = {
    itemId: string;
    variantId: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    selectedModifiers: { id: string; priceDeltaCents: number }[];
    taxable: boolean;
  };

  const rows: Row[] = input.lines.map((line) => {
    const item = itemById.get(line.itemId);
    if (!item) throw new Error(`Item ${line.itemId} not in catalog`);

    const variant = line.variantId
      ? (item.variants.find((v) => v.id === line.variantId) ?? null)
      : null;
    if (line.variantId && !variant) {
      throw new Error("Variant does not belong to item");
    }

    const variantDeltaCents = variant
      ? Math.round(Number(variant.priceDelta) * 100)
      : 0;

    const allModifiers = new Map(
      item.modifierGroups.flatMap((mg) =>
        mg.modifierGroup.modifiers.map((m) => [m.id, m] as const),
      ),
    );

    const selectedModifiers = line.modifierIds.map((id) => {
      const mod = allModifiers.get(id);
      if (!mod) throw new Error("Modifier not allowed on this item");
      return { id, priceDeltaCents: Math.round(Number(mod.priceDelta) * 100) };
    });

    // Required modifier groups must have ≥1 selection
    for (const mg of item.modifierGroups) {
      if (!mg.modifierGroup.required) continue;
      const hit = mg.modifierGroup.modifiers.some((m) =>
        line.modifierIds.includes(m.id),
      );
      if (!hit) {
        throw new Error(
          `${item.name}: required choice "${mg.modifierGroup.name}"`,
        );
      }
    }

    const baseCents = Math.round(Number(item.basePrice) * 100);
    const modDeltaCents = selectedModifiers.reduce(
      (s, m) => s + m.priceDeltaCents,
      0,
    );
    const unitPriceCents = baseCents + variantDeltaCents + modDeltaCents;

    return {
      itemId: line.itemId,
      variantId: variant?.id ?? null,
      quantity: line.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * line.quantity,
      selectedModifiers,
      taxable: item.taxable,
    };
  });

  const taxRate = Number(business.taxRate);
  const totals = computeTotals({
    lines: rows.map((r) => ({
      unitPriceCents: r.unitPriceCents,
      modifierDeltaCents: 0, // already folded into unitPriceCents
      quantity: r.quantity,
      taxable: r.taxable,
    })),
    taxRate,
    tipCents: input.tipCents,
  });

  const dayStart = startOfBusinessDay(new Date(), business.timezone);
  const todaysCount = await db.order.count({
    where: { businessId: business.id, createdAt: { gte: dayStart } },
  });

  const order = await db.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        businessId: business.id,
        locationId: business.locations[0]?.id ?? null,
        number: todaysCount + 1,
        status: "paid",
        subtotal: dec(totals.subtotalCents),
        tax: dec(totals.taxCents),
        tip: dec(totals.tipCents),
        discount: dec(totals.discountCents),
        total: dec(totals.totalCents),
        closedAt: new Date(),
        lines: {
          create: rows.map((r) => ({
            itemId: r.itemId,
            variantId: r.variantId,
            quantity: r.quantity,
            unitPrice: dec(r.unitPriceCents),
            lineTotal: dec(r.lineTotalCents),
            modifiers: {
              create: r.selectedModifiers.map((m) => ({
                modifierId: m.id,
                priceDelta: dec(m.priceDeltaCents),
              })),
            },
          })),
        },
        payments: {
          create: {
            method: input.paymentMethod,
            amount: dec(totals.totalCents),
            status: "succeeded",
          },
        },
      },
    });
  });

  revalidatePath(`/admin/${input.businessSlug}` as never);
  redirect(`/pos/${input.businessSlug}/receipt/${order.id}` as never);
}
