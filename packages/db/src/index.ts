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

export * from "@prisma/client";
