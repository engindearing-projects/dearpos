import Link from "next/link";
import { db } from "@dearpos/db";
import { notFound } from "next/navigation";

export default async function StaffListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ inactive?: string }>;
}) {
  const { slug } = await params;
  const { inactive } = await searchParams;
  const showInactive = inactive === "1";

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const staff = await db.staff.findMany({
    where: {
      businessId: business.id,
      ...(showInactive ? {} : { active: true }),
    },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { shifts: true, orders: true } },
    },
  });

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Staff</h2>
          <Link
            href={
              `/admin/${slug}/staff${showInactive ? "" : "?inactive=1"}` as never
            }
            className="text-xs text-[color:var(--color-muted)] underline-offset-4 hover:underline"
          >
            {showInactive ? "Hide inactive" : "Show inactive"}
          </Link>
        </div>
        <Link
          href={`/admin/${slug}/staff/new` as never}
          className="rounded-lg bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-semibold text-[color:var(--color-background)] hover:opacity-90"
        >
          + New staff
        </Link>
      </header>

      {staff.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-6 text-[color:var(--color-muted)]">
          No staff yet. Add one to start ringing up orders.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-foreground)]/10 overflow-hidden rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40">
          {staff.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-12 items-baseline gap-3 px-5 py-4"
            >
              <div className="col-span-5">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={`/admin/${slug}/staff/${s.id}` as never}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {s.name}
                  </Link>
                  {!s.active && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                      inactive
                    </span>
                  )}
                </div>
                <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                  {s.role}
                </div>
              </div>
              <div className="col-span-3 text-sm text-[color:var(--color-muted)]">
                {s._count.shifts} shift{s._count.shifts === 1 ? "" : "s"}
              </div>
              <div className="col-span-3 text-sm text-[color:var(--color-muted)]">
                {s._count.orders} order{s._count.orders === 1 ? "" : "s"}
              </div>
              <div className="col-span-1 text-right">
                <Link
                  href={`/admin/${slug}/staff/${s.id}` as never}
                  className="text-xs text-[color:var(--color-accent)] underline-offset-4 hover:underline"
                >
                  Edit →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
