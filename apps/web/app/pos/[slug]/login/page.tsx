import { db } from "@dearpos/db";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { readSession } from "@/lib/session";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Already signed in? Send them to the POS.
  const existing = await readSession(slug);
  if (existing) redirect(`/pos/${slug}` as never);

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const staff = await db.staff.findMany({
    where: { businessId: business.id, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {business.logoUrl && (
        <Image
          src={business.logoUrl}
          alt={`${business.name} logo`}
          width={72}
          height={72}
          unoptimized
          className="mb-6 h-18 w-18 rounded-xl object-cover shadow-sm"
        />
      )}
      <LoginForm slug={slug} businessName={business.name} staff={staff} />
    </main>
  );
}
