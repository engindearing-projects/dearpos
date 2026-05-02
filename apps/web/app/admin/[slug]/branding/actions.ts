"use server";

import { db } from "@dearpos/db";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_COLORS,
  PRESETS,
  type BusinessThemeJson,
  type ThemeColors,
  isHex,
} from "@/lib/themes";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_LOGO_BYTES = 1_500_000; // 1.5 MB

export async function updateTheme(input: {
  slug: string;
  presetId: string;
  colors: ThemeColors;
}) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  const preset = PRESETS.find((p) => p.id === input.presetId) ?? PRESETS[0]!;

  // Only persist colors that diverge from the preset; if everything matches,
  // leave colors empty so future preset tweaks come through.
  const overrides: Partial<ThemeColors> = {};
  for (const key of ["background", "foreground", "accent", "muted"] as const) {
    const incoming = input.colors[key];
    if (!incoming || !isHex(incoming)) {
      throw new Error(`Invalid hex color for ${key}`);
    }
    if (incoming.toLowerCase() !== preset.colors[key].toLowerCase()) {
      overrides[key] = incoming;
    }
  }

  const theme: BusinessThemeJson = { preset: preset.id };
  if (Object.keys(overrides).length > 0) theme.colors = overrides;

  await db.business.update({
    where: { id: business.id },
    data: { theme: theme as never },
  });

  revalidatePath(`/admin/${input.slug}` as never, "layout");
  revalidatePath(`/pos/${input.slug}` as never, "layout");
}

export async function resetTheme(input: { slug: string }) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!business) throw new Error("Business not found");

  await db.business.update({
    where: { id: business.id },
    data: { theme: { preset: "default" } as never },
  });
  revalidatePath(`/admin/${input.slug}` as never, "layout");
  revalidatePath(`/pos/${input.slug}` as never, "layout");
}

export async function uploadLogo(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const slug = formData.get("slug");
  const file = formData.get("logo");

  if (typeof slug !== "string") return { ok: false, error: "Missing slug" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick an image" };
  }
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { ok: false, error: "PNG, JPEG, WEBP or SVG only" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Image must be under 1.5 MB" };
  }

  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true, logoUrl: true },
  });
  if (!business) return { ok: false, error: "Business not found" };

  await mkdir(path.join(UPLOADS_DIR, business.id), { recursive: true });

  const ext = mimeToExt(file.type);
  const filename = `logo-${Date.now()}.${ext}`;
  const relPath = path.posix.join("/uploads", business.id, filename);
  const fullPath = path.join(UPLOADS_DIR, business.id, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  // Best-effort cleanup of the previous logo so the uploads dir doesn't
  // accumulate every iteration.
  if (business.logoUrl?.startsWith(`/uploads/${business.id}/`)) {
    const oldPath = path.join(process.cwd(), "public", business.logoUrl);
    try {
      await unlink(oldPath);
    } catch {
      // ignore
    }
  }

  await db.business.update({
    where: { id: business.id },
    data: { logoUrl: relPath },
  });

  revalidatePath(`/admin/${slug}` as never, "layout");
  revalidatePath(`/pos/${slug}` as never, "layout");
  return { ok: true };
}

export async function removeLogo(input: { slug: string }) {
  const business = await db.business.findUnique({
    where: { slug: input.slug },
    select: { id: true, logoUrl: true },
  });
  if (!business) throw new Error("Business not found");

  if (business.logoUrl?.startsWith(`/uploads/${business.id}/`)) {
    const oldPath = path.join(process.cwd(), "public", business.logoUrl);
    try {
      await unlink(oldPath);
    } catch {
      // ignore
    }
  }

  await db.business.update({
    where: { id: business.id },
    data: { logoUrl: null },
  });
  revalidatePath(`/admin/${input.slug}` as never, "layout");
  revalidatePath(`/pos/${input.slug}` as never, "layout");
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

// Re-export defaults for the form to seed unset color picks.
export async function getDefaultColors(): Promise<ThemeColors> {
  return DEFAULT_COLORS;
}
