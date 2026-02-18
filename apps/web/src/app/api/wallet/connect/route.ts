import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  walletId: z.string(),
  email: z.string().email(),
  refreshUrl: z.string().url(),
  returnUrl: z.string().url()
});

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    const [customer, account] = await Promise.all([
      stripe.customers.create({ email: payload.email }),
      stripe.accounts.create({ type: "express", email: payload.email })
    ]);

    const link = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: payload.refreshUrl,
      return_url: payload.returnUrl
    });

    const walletUpdate = await supabase
      .from("Wallet")
      .update({
        stripeCustomerId: customer.id,
        stripeConnectId: account.id
      } as never)
      .eq("id", payload.walletId);

    if (walletUpdate.error) {
      return NextResponse.json({ error: walletUpdate.error.message }, { status: 400 });
    }

    return NextResponse.json({ onboardingUrl: link.url, accountId: account.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
