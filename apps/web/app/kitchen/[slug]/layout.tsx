import { notFound } from "next/navigation";
import { db } from "@dearpos/db";
import { BusinessTheme } from "@/components/business-theme";

// Kitchen surface is back-of-house — no PIN gate. Apply the business
// theme so the wall display matches the brand.
export default async function KitchenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    select: { logoUrl: true, theme: true },
  });
  if (!business) notFound();

  return <BusinessTheme business={business}>{children}</BusinessTheme>;
}
