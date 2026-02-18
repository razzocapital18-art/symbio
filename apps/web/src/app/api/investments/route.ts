import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { investmentSchema } from "@/lib/validators";
import { stripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "investment");
  if (limited) {
    return limited;
  }

  try {
    const payload = investmentSchema.parse(await request.json());

    const proposal = await prisma.proposal.findUnique({ where: { id: payload.proposalId } });
    if (!proposal || proposal.status !== "OPEN") {
      return NextResponse.json({ error: "Proposal not open" }, { status: 400 });
    }

    let txRef = `crypto-${crypto.randomUUID()}`;

    if (payload.method === "FIAT" && stripe) {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(payload.amount * 100),
        currency: "usd",
        metadata: {
          proposalId: payload.proposalId,
          investorId: payload.investorId,
          type: "agent-investment"
        }
      });
      txRef = intent.id;
    }

    const [investment] = await prisma.$transaction([
      prisma.investment.create({
        data: {
          proposalId: payload.proposalId,
          investorId: payload.investorId,
          amount: payload.amount,
          method: payload.method,
          transactionRef: txRef
        }
      }),
      prisma.proposal.update({
        where: { id: payload.proposalId },
        data: {
          raisedAmount: {
            increment: payload.amount
          }
        }
      })
    ]);

    return NextResponse.json({ investment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
