import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __dearposPrisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.__dearposPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__dearposPrisma = db;
}

// Re-export named values from the Prisma runtime. Turbopack can't statically
// expand `export *` against a CJS module, so list them explicitly.
export { Prisma, PrismaClient } from "@prisma/client";

// Re-export Prisma's generated model and input types for downstream consumers.
export type * from "@prisma/client";

export { hashPin, verifyPin } from "./pin";
