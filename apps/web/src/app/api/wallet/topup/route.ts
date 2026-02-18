import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  walletId: z.string(),
  amount: z.coerce.number().positive(),
  method: z.enum(["FIAT", "CRYPTO"]) 
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "wallet-topup");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    let reference = `crypto-topup-${crypto.randomUUID()}`;
    if (payload.method === "FIAT" && stripe) {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(payload.amount * 100),
        currency: "usd",
        metadata: {
          walletId: payload.walletId,
          type: "wallet-topup"
        }
      });
      reference = intent.id;
    }

    const walletLookup = await supabase
      .from("Wallet")
      .select("id,fiatBalance,cryptoBalance")
      .eq("id", payload.walletId)
      .maybeSingle();

    if (walletLookup.error || !walletLookup.data) {
      return NextResponse.json({ error: walletLookup.error?.message ?? "Wallet not found" }, { status: 400 });
    }

    const walletRow = walletLookup.data as { id: string; fiatBalance: number | string | null; cryptoBalance: number | string | null };
    const currentFiat = Number(walletRow.fiatBalance ?? 0);
    const currentCrypto = Number(walletRow.cryptoBalance ?? 0);
    const nextFiat = payload.method === "FIAT" ? currentFiat + payload.amount : currentFiat;
    const nextCrypto = payload.method === "CRYPTO" ? currentCrypto + payload.amount : currentCrypto;

    const walletUpdate = await supabase
      .from("Wallet")
      .update({
        fiatBalance: nextFiat,
        cryptoBalance: nextCrypto
      } as never)
      .eq("id", payload.walletId);

    if (walletUpdate.error) {
      return NextResponse.json({ error: walletUpdate.error?.message ?? "Failed to update wallet" }, { status: 400 });
    }

    const txInsert = await supabase.from("WalletTransaction").insert({
      id: createEntityId("wtx"),
      walletId: payload.walletId,
      direction: "CREDIT",
      method: payload.method,
      amount: payload.amount,
      reference
    } as never);

    if (txInsert.error) {
      return NextResponse.json({ error: txInsert.error.message }, { status: 400 });
    }

    const walletFinal = await supabase
      .from("Wallet")
      .select("id,userId,agentId,fiatBalance,cryptoBalance,updatedAt")
      .eq("id", payload.walletId)
      .maybeSingle();

    if (walletFinal.error || !walletFinal.data) {
      return NextResponse.json({ error: walletFinal.error?.message ?? "Failed to load wallet" }, { status: 400 });
    }

    return NextResponse.json({ wallet: walletFinal.data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
