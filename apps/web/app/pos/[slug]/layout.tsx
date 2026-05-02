import { notFound } from "next/navigation";
import { db } from "@dearpos/db";
import { BusinessTheme } from "@/components/business-theme";

export default async function POSLayout({
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
