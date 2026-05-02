import Link from "next/link";
import { GroupForm } from "../group-form";

export default async function NewModifierGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <section>
      <Link
        href={`/admin/${slug}/modifier-groups` as never}
        className="text-sm text-[color:var(--color-muted)] underline-offset-4 hover:underline"
      >
        ← Modifier groups
      </Link>
      <h2 className="mt-2 text-xl font-semibold">New modifier group</h2>
      <p className="mb-6 text-sm text-[color:var(--color-muted)]">
        e.g. Milk, Cook Temperature, Burger Add-ons.
      </p>
      <GroupForm
        slug={slug}
        mode={{ kind: "create" }}
        initial={{
          name: "",
          selectionType: "single",
          required: false,
          minSelections: 0,
          maxSelections: null,
          modifiers: [],
        }}
      />
    </section>
  );
}
