import { getStripe, stripeIsLive } from "@/lib/stripe";
import { ProcessorNotConfiguredError, ProcessorRefMismatchError } from "./errors";
import type { PaymentProcessor } from "./processor";
import type {
  CancelInput,
  CaptureInput,
  CaptureResult,
  CreateSaleInput,
  CreateSaleResult,
  ProcessorRef,
  RefundInput,
  RefundResult,
} from "./types";

function assertStripeRef(ref: ProcessorRef): asserts ref is ProcessorRef & {
  processor: "stripe";
} {
  if (ref.processor !== "stripe") {
    throw new ProcessorRefMismatchError("stripe", ref.processor);
  }
}

function requireStripe() {
  const stripe = getStripe();
  if (!stripe) throw new ProcessorNotConfiguredError("stripe");
  return stripe;
}

export const stripeAdapter: PaymentProcessor = {
  id: "stripe",

  isConfigured() {
    return getStripe() !== null;
  },

  isLive() {
    return stripeIsLive();
  },

  async createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
    const stripe = requireStripe();

    const intent = await stripe.paymentIntents.create({
      amount: input.amount.amountCents,
      currency: input.amount.currency.toLowerCase(),
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        dearpos_order_id: input.orderId,
        dearpos_business_id: input.businessId,
        dearpos_business_slug: input.businessSlug,
        ...(input.metadata ?? {}),
      },
    });

    return {
      ref: { processor: "stripe", intentId: intent.id },
      clientHandoff: {
        kind: "stripe-terminal",
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret ?? "",
      },
    };
  },

  async capture(input: CaptureInput): Promise<CaptureResult> {
    assertStripeRef(input.ref);
    const stripe = requireStripe();

    const intent = await stripe.paymentIntents.retrieve(input.ref.intentId);
    let captured = intent;
    if (intent.status === "requires_capture") {
      captured = await stripe.paymentIntents.capture(input.ref.intentId);
    }
    if (captured.status !== "succeeded") {
      throw new Error(`PaymentIntent ${captured.id} is ${captured.status}`);
    }

    const chargeId =
      typeof captured.latest_charge === "string"
        ? captured.latest_charge
        : (captured.latest_charge?.id ?? undefined);

    return {
      ref: {
        processor: "stripe",
        intentId: input.ref.intentId,
        ...(chargeId ? { chargeId } : {}),
      },
    };
  },

  async cancel(input: CancelInput): Promise<void> {
    assertStripeRef(input.ref);
    const stripe = getStripe();
    // Best-effort: if Stripe is gone or the intent is already terminal we
    // still want the local void to proceed.
    if (!stripe) return;
    try {
      await stripe.paymentIntents.cancel(input.ref.intentId);
    } catch {
      // ignored — caller treats the local state as authoritative
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    assertStripeRef(input.ref);
    const stripe = requireStripe();

    const refund = await stripe.refunds.create({
      payment_intent: input.ref.intentId,
      amount: input.amountCents,
      ...(input.reason ? { reason: "requested_by_customer" as const } : {}),
    });

    return { processorRefundId: refund.id };
  },
};
