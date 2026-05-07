// Processor-agnostic errors. Adapters translate vendor errors into these so
// callers don't need a `if (instanceof Stripe.errors.StripeError)` ladder.

export class ProcessorNotConfiguredError extends Error {
  constructor(processor: string) {
    super(`Payment processor '${processor}' is not configured`);
    this.name = "ProcessorNotConfiguredError";
  }
}

export class ProcessorRefMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`Processor ref mismatch: expected ${expected}, got ${actual}`);
    this.name = "ProcessorRefMismatchError";
  }
}
