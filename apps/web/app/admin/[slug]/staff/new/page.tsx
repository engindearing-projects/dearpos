import Link from "next/link";
import { NewStaffForm } from "./new-staff-form";

export default async function NewStaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <section>
      <Link
        href={`/admin/${slug}/staff` as never}
        className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
      >
        ← Staff
      </Link>
      <h2 className="mt-2 text-xl font-semibold">New staff</h2>
      <p className="mb-6 text-sm text-[color:var(--color-muted)]">
        Pick a 4-digit PIN they'll use to clock in on the POS.
      </p>
      <NewStaffForm slug={slug} />
    </section>
  );
}
