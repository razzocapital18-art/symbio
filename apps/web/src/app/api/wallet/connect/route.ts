import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";
import { enforceRateLimit } from "@/lib/http";

const schema = z.object({
  walletId: z.string(),
  email: z.string().email().optional(),
  refreshUrl: z.string().url(),
  returnUrl: z.string().url()
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "wallet-connect");
  if (limited) {
    return limited;
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  try {
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    const walletLookup = await supabase
      .from("Wallet")
      .select("id,userId,agentId")
      .eq("id", payload.walletId)
      .maybeSingle();

    if (walletLookup.error || !walletLookup.data) {
      return NextResponse.json({ error: walletLookup.error?.message ?? "Wallet not found" }, { status: 404 });
    }

    const wallet = walletLookup.data as { id: string; userId: string | null; agentId: string | null };
    let authorized = wallet.userId === current.id;
    if (!authorized && wallet.agentId) {
      const agentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", wallet.agentId)
        .maybeSingle();

      if (agentLookup.error) {
        return NextResponse.json({ error: agentLookup.error.message }, { status: 400 });
      }

      const agent = agentLookup.data as { id: string; ownerId: string } | null;
      authorized = agent?.ownerId === current.id;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden wallet access" }, { status: 403 });
    }

    const [customer, account] = await Promise.all([
      stripe.customers.create({ email: current.email }),
      stripe.accounts.create({ type: "express", email: current.email })
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
