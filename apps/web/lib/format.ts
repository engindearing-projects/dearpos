import type { Prisma } from "@dearpos/db";

export function fmtMoney(value: Prisma.Decimal | number | string): string {
  const n = typeof value === "object" ? Number(value.toString()) : Number(value);
  return `$${n.toFixed(2)}`;
}

export function fmtMoneyDelta(value: Prisma.Decimal | number | string): string {
  const n = typeof value === "object" ? Number(value.toString()) : Number(value);
  if (n === 0) return "";
  const sign = n > 0 ? "+" : "−";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
