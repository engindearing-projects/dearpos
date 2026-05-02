// Money math. Everything in here uses cents (integer) internally to dodge float drift,
// and converts to/from decimal-string at the boundary.
//
// Prisma's Decimal is the wire format; cents is the working format.

export type Cents = number;

export interface CartLineInput {
  unitPriceCents: Cents;
  quantity: number;
  modifierDeltaCents: Cents;  // sum of selected modifier priceDeltas, in cents
  taxable: boolean;
}

export interface OrderTotals {
  subtotalCents: Cents;
  taxCents: Cents;
  tipCents: Cents;
  discountCents: Cents;
  totalCents: Cents;
}

export function lineTotalCents(line: CartLineInput): Cents {
  return (line.unitPriceCents + line.modifierDeltaCents) * line.quantity;
}

export interface ComputeTotalsInput {
  lines: CartLineInput[];
  taxRate: number;        // 0.089 = 8.9%
  tipCents?: Cents;
  discountCents?: Cents;
}

export function computeTotals({
  lines,
  taxRate,
  tipCents = 0,
  discountCents = 0,
}: ComputeTotalsInput): OrderTotals {
  let subtotalCents = 0;
  let taxableSubtotalCents = 0;

  for (const line of lines) {
    const lt = lineTotalCents(line);
    subtotalCents += lt;
    if (line.taxable) taxableSubtotalCents += lt;
  }

  const taxableAfterDiscount = Math.max(0, taxableSubtotalCents - discountCents);
  const taxCents = Math.round(taxableAfterDiscount * taxRate);

  const totalCents = Math.max(
    0,
    subtotalCents - discountCents + taxCents + tipCents
  );

  return { subtotalCents, taxCents, tipCents, discountCents, totalCents };
}

export function toDollars(cents: Cents): string {
  return (cents / 100).toFixed(2);
}

export function fromDollars(dollars: string | number): Cents {
  const n = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  return Math.round(n * 100);
}
