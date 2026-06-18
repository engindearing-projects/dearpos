import type {
  CancelInput,
  CaptureInput,
  CaptureResult,
  CreateSaleInput,
  CreateSaleResult,
  ProcessorId,
  RefundInput,
  RefundResult,
} from "./types";

// Server-side payment processor interface. Implemented per vendor
// (Stripe today, Square in v0.2). Every checkout server action goes through
// this — never the vendor SDK directly — so swapping or adding processors
// doesn't fan out across call sites.
//
// The interface is deliberately small. Vendor-specific concerns that can't
// be abstracted cleanly (Stripe Terminal connection tokens, Square Reader
// OAuth) stay in adapter-specific routes.
export interface PaymentProcessor {
  readonly id: ProcessorId;

  // Whether the secret key / OAuth credentials are present. Card paths gate
  // themselves on this so the app still runs without keys configured.
  isConfigured(): boolean;

  // Whether the configured credentials point at a live (real money) account
  // vs a test account. Used to decide whether dev affordances like the
  // simulate-tap button should be available.
  isLive(): boolean;

  // Create a sale on the processor side. Returns a ref the server should
  // persist on the Payment row plus a clientHandoff bag the client SDK
  // (Stripe Terminal, Square Reader) needs to actually collect the card.
  createSale(input: CreateSaleInput): Promise<CreateSaleResult>;

  // Capture an authorized sale. For Stripe with capture_method: "automatic"
  // this will retrieve the intent and capture if it's still in
  // requires_capture. For Square the equivalent is finalizing a deferred
  // payment. Idempotent: calling on an already-captured sale is a no-op.
  capture(input: CaptureInput): Promise<CaptureResult>;

  // Cancel a sale before capture. Used when the cashier voids an open card
  // order. Best-effort — local order state is still the source of truth.
  cancel(input: CancelInput): Promise<void>;

  // Refund a captured sale, partially or fully. amountCents is the slice to
  // refund on this call (not the running total).
  refund(input: RefundInput): Promise<RefundResult>;
}

// Returns the processor for a given business. v0.1 returns the Stripe
// adapter unconditionally. v0.2 will read a per-Business setting (e.g.,
// `business.cardProcessor`) and dispatch.
//
// Pass-through arg shape kept future-friendly so callers don't need to
// change when v0.2 lands.
export function getProcessor(_opts?: {
  processorId?: ProcessorId;
}): PaymentProcessor {
  // Lazy import keeps the Stripe SDK out of any code path that doesn't
  // touch payments (matters for cold-start time on serverless).
  const { stripeAdapter } = require("./stripe-adapter") as {
    stripeAdapter: PaymentProcessor;
  };
  return stripeAdapter;
}
