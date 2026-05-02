"use server";

import { db, verifyPin } from "@dearpos/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_TTL_MS,
  cookieName,
  encodeSession,
  readSession,
} from "@/lib/session";
import { startOfBusinessDay } from "@/lib/business-day";

export async function signIn(input: {
  slug: string;
  staffId: string;
  pin: string;
}) {
  if (!/^\d{3,8}$/.test(input.pin)) {
    return { ok: false, error: "Enter a 4-digit PIN" } as const;
  }

  const business = await db.business.findUnique({
    where: { slug: input.slug },
  });
  if (!business) return { ok: false, error: "Unknown business" } as const;

  const staff = await db.staff.findFirst({
    where: { id: input.staffId, businessId: business.id, active: true },
  });
  if (!staff) return { ok: false, error: "Staff not found" } as const;

  if (!verifyPin(input.pin, staff.pinHash)) {
    return { ok: false, error: "Wrong PIN" } as const;
  }

  // Reuse an open shift from earlier today, or open a new one.
  const dayStart = startOfBusinessDay(new Date(), business.timezone);
  const open = await db.shift.findFirst({
    where: {
      businessId: business.id,
      staffId: staff.id,
      clockOut: null,
      clockIn: { gte: dayStart },
    },
    orderBy: { clockIn: "desc" },
  });
  const shift =
    open ??
    (await db.shift.create({
      data: {
        businessId: business.id,
        staffId: staff.id,
        clockIn: new Date(),
      },
    }));

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = encodeSession({
    staffId: staff.id,
    shiftId: shift.id,
    businessId: business.id,
    exp: expiresAt,
  });

  const jar = await cookies();
  jar.set(cookieName(input.slug), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  redirect(`/pos/${input.slug}` as never);
}

export async function signOut(input: { slug: string; closeShift: boolean }) {
  const session = await readSession(input.slug);
  if (session && input.closeShift) {
    // Close the shift only if it's still open. Idempotent across re-clicks.
    await db.shift.updateMany({
      where: { id: session.shiftId, clockOut: null },
      data: { clockOut: new Date() },
    });
  }
  const jar = await cookies();
  jar.delete(cookieName(input.slug));
  redirect(`/pos/${input.slug}/login` as never);
}
