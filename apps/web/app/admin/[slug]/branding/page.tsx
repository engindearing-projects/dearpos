import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { resolveTheme } from "@/lib/themes";
import { BrandingForm } from "./branding-form";

export default async function BrandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const { presetId, colors, logoUrl } = resolveTheme(business);

  return (
    <section>
      <header className="mb-6">
        <h2 className="text-xl font-semibold">Branding</h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Logo and colors apply across the admin and POS for {business.name}.
        </p>
      </header>

      <BrandingForm
        slug={slug}
        businessName={business.name}
        initialPresetId={presetId}
        initialColors={colors}
        initialLogoUrl={logoUrl}
      />
    </section>
  );
}
