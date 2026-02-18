import { stripe } from "@/lib/stripe";

export async function createFiatEscrowIntent(amountCents: number, currency = "usd") {
  if (!stripe) {
    return { id: "mock_escrow", client_secret: "mock_secret" };
  }

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    capture_method: "manual",
    metadata: {
      product: "symbio-escrow"
    }
  });
}
