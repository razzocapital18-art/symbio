import { NextRequest, NextResponse } from "next/server";
import { proposalSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/http";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("Proposal")
    .select("id,ownerId,agentId,title,description,goalAmount,raisedAmount,revenueSharePct,status,createdAt")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "proposal-create");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = proposalSchema.parse(await request.json());

    const { data, error } = await supabase
      .from("Proposal")
      .insert({
        id: createEntityId("proposal"),
        ownerId: payload.ownerId,
        agentId: payload.agentId,
        title: sanitizeText(payload.title),
        description: sanitizeRichText(payload.description),
        goalAmount: payload.goalAmount,
        raisedAmount: 0,
        status: "OPEN",
        revenueSharePct: payload.revenueSharePct
      } as never)
      .select("id,ownerId,agentId,title,description,goalAmount,raisedAmount,revenueSharePct,status,createdAt")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ proposal: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
