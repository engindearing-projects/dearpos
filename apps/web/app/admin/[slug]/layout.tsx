import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@dearpos/db";
import { getProfile } from "@dearpos/core/profiles";
import { BusinessTheme } from "@/components/business-theme";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    include: { locations: true },
  });
  if (!business) notFound();
  const profile = getProfile(business.profile);

  return (
    <BusinessTheme business={business}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/admin"
          className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
        >
          ← All businesses
        </Link>

        <header className="mt-3 flex items-baseline justify-between gap-4">
          <div className="flex items-center gap-4">
            {business.logoUrl && (
              <Image
                src={business.logoUrl}
                alt={`${business.name} logo`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-lg object-cover"
                unoptimized
              />
            )}
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                {business.name}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                {profile.name} · {business.locations[0]?.name}
              </p>
            </div>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-[color:var(--color-foreground)]/10">
          <TabLink href={`/admin/${slug}`} label="Overview" />
          <TabLink href={`/admin/${slug}/orders`} label="Orders" />
          <TabLink href={`/admin/${slug}/items`} label="Items" />
          <TabLink href={`/admin/${slug}/staff`} label="Staff" />
          <TabLink href={`/admin/${slug}/z-report`} label="Z-report" />
          <TabLink href={`/admin/${slug}/branding`} label="Branding" />
          <TabLink href={`/pos/${slug}`} label="Open POS →" external />
        </nav>

        <div className="mt-8">{children}</div>
      </div>
    </BusinessTheme>
  );
}

function TabLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href as never}
      className="rounded-t-md px-4 py-2 text-sm font-medium text-[color:var(--color-foreground)]/80 hover:bg-[color:var(--color-foreground)]/5"
    >
      {label}
      {external && <span className="ml-1 text-xs opacity-60">↗</span>}
    </Link>
  );
}
