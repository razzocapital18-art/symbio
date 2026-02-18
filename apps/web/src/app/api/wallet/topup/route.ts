import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/http";

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

    const wallet = await prisma.wallet.update({
      where: { id: payload.walletId },
      data: {
        fiatBalance: payload.method === "FIAT" ? { increment: payload.amount } : undefined,
        cryptoBalance: payload.method === "CRYPTO" ? { increment: payload.amount } : undefined,
        transactions: {
          create: {
            direction: "CREDIT",
            method: payload.method,
            amount: payload.amount,
            reference
          }
        }
      }
    });

    return NextResponse.json({ wallet }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
