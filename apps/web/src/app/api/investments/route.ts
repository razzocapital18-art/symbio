import { NextRequest, NextResponse } from "next/server";
import { investmentSchema } from "@/lib/validators";
import { stripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "investment");
  if (limited) {
    return limited;
  }

  try {
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = investmentSchema.parse(await request.json());
    if (payload.investorId && payload.investorId !== current.id) {
      return NextResponse.json({ error: "Forbidden investorId" }, { status: 403 });
    }
    if (payload.method === "FIAT" && !stripe) {
      return NextResponse.json({ error: "Stripe is not configured for fiat investments" }, { status: 400 });
    }

    const proposalLookup = await supabase
      .from("Proposal")
      .select("id,status,raisedAmount,goalAmount")
      .eq("id", payload.proposalId)
      .maybeSingle();

    if (proposalLookup.error) {
      return NextResponse.json({ error: proposalLookup.error.message }, { status: 400 });
    }

    const proposal = proposalLookup.data as {
      id: string;
      status: string;
      raisedAmount: number | string | null;
      goalAmount: number | string | null;
    } | null;

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
          investorId: current.id,
          type: "agent-investment"
        }
      });
      txRef = intent.id;
    }

    const investmentId = createEntityId("investment");
    const investmentInsert = await supabase
      .from("Investment")
      .insert({
        id: investmentId,
        proposalId: payload.proposalId,
        investorId: current.id,
        amount: payload.amount,
        method: payload.method,
        transactionRef: txRef
      } as never);

    if (investmentInsert.error) {
      return NextResponse.json({ error: investmentInsert.error.message }, { status: 400 });
    }

    const updatedRaisedAmount = Number(proposal.raisedAmount ?? 0) + payload.amount;
    const goalAmount = Number(proposal.goalAmount ?? 0);
    const proposalUpdate = await supabase
      .from("Proposal")
      .update(
        {
          raisedAmount: updatedRaisedAmount,
          status: goalAmount > 0 && updatedRaisedAmount >= goalAmount ? "FUNDED" : proposal.status
        } as never
      )
      .eq("id", payload.proposalId);

    if (proposalUpdate.error) {
      return NextResponse.json({ error: proposalUpdate.error.message }, { status: 400 });
    }

    const investmentLookup = await supabase
      .from("Investment")
      .select("id,proposalId,investorId,amount,method,transactionRef,createdAt")
      .eq("id", investmentId)
      .maybeSingle();

    if (investmentLookup.error || !investmentLookup.data) {
      return NextResponse.json({ error: investmentLookup.error?.message ?? "Failed to load investment" }, { status: 400 });
    }

    return NextResponse.json({ investment: investmentLookup.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
