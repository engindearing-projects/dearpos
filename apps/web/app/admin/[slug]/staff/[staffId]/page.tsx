import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";
import { EditStaffForm } from "./edit-staff-form";
import { ResetPinForm } from "./reset-pin-form";
import { StaffActiveToggle } from "./active-toggle";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ slug: string; staffId: string }>;
}) {
  const { slug, staffId } = await params;

  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!business) notFound();

  const staff = await db.staff.findFirst({
    where: { id: staffId, businessId: business.id },
    include: { _count: { select: { shifts: true, orders: true } } },
  });
  if (!staff) notFound();

  return (
    <section className="space-y-8">
      <Link
        href={`/admin/${slug}/staff` as never}
        className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
      >
        ← Staff
      </Link>

      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{staff.name}</h2>
          <p className="text-xs text-[color:var(--color-muted)]">
            {staff.active ? "Active" : "Inactive"} · {staff._count.shifts}{" "}
            shifts · {staff._count.orders} orders
          </p>
        </div>
        <StaffActiveToggle
          slug={slug}
          staffId={staff.id}
          active={staff.active}
        />
      </header>

      <Card title="Profile">
        <EditStaffForm
          slug={slug}
          staffId={staff.id}
          initialName={staff.name}
          initialRole={staff.role}
        />
      </Card>

      <Card title="Reset PIN">
        <ResetPinForm slug={slug} staffId={staff.id} />
      </Card>
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}
