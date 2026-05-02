import { db } from "@dearpos/db";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@dearpos/core/profiles";
import { POSScreen } from "./pos-screen";
import { readSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export default async function POSPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    include: { locations: true },
  });
  if (!business) notFound();

  const session = await readSession(slug);
  if (!session || session.businessId !== business.id) {
    redirect(`/pos/${slug}/login` as never);
  }

  const staff = await db.staff.findFirst({
    where: { id: session.staffId, businessId: business.id, active: true },
    select: { id: true, name: true, role: true },
  });
  if (!staff) redirect(`/pos/${slug}/login` as never);

  const shift = await db.shift.findUnique({
    where: { id: session.shiftId },
    select: { id: true, startingCash: true },
  });
  if (!shift) redirect(`/pos/${slug}/login` as never);

  const items = await db.item.findMany({
    where: { businessId: business.id, active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      modifierGroups: {
        include: {
          modifierGroup: {
            include: { modifiers: { orderBy: { sortOrder: "asc" } } },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const profile = getProfile(business.profile);

  // Serialize Decimal → number for client component (cents)
  const serializedItems = items.map((it) => ({
    id: it.id,
    sku: it.sku,
    name: it.name,
    description: it.description,
    category: it.category ?? "Uncategorized",
    basePriceCents: Math.round(Number(it.basePrice) * 100),
    kitchenStation: it.kitchenStation,
    variants: it.variants.map((v) => ({
      id: v.id,
      name: v.name,
      priceDeltaCents: Math.round(Number(v.priceDelta) * 100),
      isDefault: v.isDefault,
    })),
    modifierGroups: it.modifierGroups.map((mg) => ({
      id: mg.modifierGroup.id,
      name: mg.modifierGroup.name,
      selectionType: mg.modifierGroup.selectionType as "single" | "multiple",
      required: mg.modifierGroup.required,
      maxSelections: mg.modifierGroup.maxSelections,
      modifiers: mg.modifierGroup.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        priceDeltaCents: Math.round(Number(m.priceDelta) * 100),
        isDefault: m.isDefault,
      })),
    })),
  }));

  return (
    <POSScreen
      business={{
        slug: business.slug,
        name: business.name,
        location: business.locations[0]?.name ?? "",
        taxRate: Number(business.taxRate),
        tipSuggestions: profile.defaults.tipSuggestions,
        primaryAction: profile.ui.primaryAction,
        cardPaymentsAvailable: Boolean(getStripe()),
      }}
      staff={staff}
      shift={{
        id: shift.id,
        startingCashCents:
          shift.startingCash != null
            ? Math.round(Number(shift.startingCash) * 100)
            : null,
      }}
      items={serializedItems}
    />
  );
}
