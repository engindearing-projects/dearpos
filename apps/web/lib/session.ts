import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_PREFIX = "dearpos_sess_";
const TTL_HOURS = 12;

export type SessionPayload = {
  staffId: string;
  shiftId: string;
  businessId: string;
  exp: number; // ms epoch
};

function secret(): string {
  const s = process.env.DEARPOS_SECRET;
  if (s && s.length >= 16) return s;
  // Dev-only fallback. Production must set DEARPOS_SECRET.
  return "dearpos-dev-only-do-not-ship-this-secret";
}

export function cookieName(slug: string) {
  return `${COOKIE_PREFIX}${slug}`;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  if (expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

export const SESSION_TTL_MS = TTL_HOURS * 60 * 60 * 1000;

export async function readSession(slug: string): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(cookieName(slug))?.value);
}
