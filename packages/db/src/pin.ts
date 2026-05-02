import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

// scrypt with a 16-byte random salt. Storage format: "<saltHex>:<hashHex>".
// PINs are low-entropy by design — combine with rate-limited entry on the
// frontend and consider this a v0.1 floor.
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const got = scryptSync(pin, salt, expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
