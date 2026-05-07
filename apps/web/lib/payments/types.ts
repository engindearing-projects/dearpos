// Shared types for the payment processor abstraction.
//
// The interface covers the *server-side* lifecycle: create a sale, capture
// it after the in-person card has been read by the terminal SDK, cancel it
// before capture, and refund it after. Client-side processor SDK bootstrap
// (Stripe Terminal connection tokens, Square Reader OAuth) stays in
// processor-specific routes — those flows are too different to abstract
// without leaks.

export type Money = {
  amountCents: number;
  currency: string; // ISO-4217, lowercase per Stripe convention
};

export type ProcessorId = "stripe" | "square";

// Identifies a payment with whichever processor handled it. The DB still
// stores Stripe-specific columns in v0.1; v0.2 will add `processor` +
// generic `processorRef` to support Square alongside.
export type ProcessorRef = {
  processor: ProcessorId;
  intentId: string; // PaymentIntent ID for Stripe, Payment ID for Square
  chargeId?: string; // populated after capture for Stripe
};

export type CreateSaleInput = {
  orderId: string;
  businessId: string;
  businessSlug: string;
  amount: Money;
  // Free-form metadata to attach to the processor-side record. Used for
  // reconciliation when reading webhooks or processor dashboards.
  metadata?: Record<string, string>;
};

// Returned to the server caller. The `clientHandoff` is the bag of values
// the in-browser / in-app processor SDK needs to actually collect the card.
export type CreateSaleResult = {
  ref: ProcessorRef;
  clientHandoff: ClientHandoff;
};

export type ClientHandoff =
  | {
      kind: "stripe-terminal";
      paymentIntentId: string;
      // Stripe Terminal's collectPaymentMethod takes a client_secret.
      clientSecret: string;
    }
  | {
      kind: "square-reader";
      paymentId: string;
      locationId: string;
    };

export type CaptureInput = { ref: ProcessorRef };
export type CaptureResult = {
  ref: ProcessorRef; // chargeId populated when available
};

export type CancelInput = { ref: ProcessorRef };

export type RefundInput = {
  ref: ProcessorRef;
  amountCents: number;
  reason?: string;
};
export type RefundResult = {
  processorRefundId: string;
};
