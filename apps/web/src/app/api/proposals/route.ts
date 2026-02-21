import { NextRequest, NextResponse } from "next/server";
import { proposalSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/http";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

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
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (current.role !== "AGENT_BUILDER") {
      return NextResponse.json({ error: "Only Agent Builders can create proposals" }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = proposalSchema.parse(await request.json());
    if (payload.ownerId && payload.ownerId !== current.id) {
      return NextResponse.json({ error: "Forbidden ownerId" }, { status: 403 });
    }

    const agentLookup = await supabase
      .from("Agent")
      .select("id,ownerId")
      .eq("id", payload.agentId)
      .maybeSingle();
    if (agentLookup.error) {
      return NextResponse.json({ error: agentLookup.error.message }, { status: 400 });
    }

    const agent = agentLookup.data as { id: string; ownerId: string } | null;
    if (!agent || agent.ownerId !== current.id) {
      return NextResponse.json({ error: "Agent must be owned by current builder" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("Proposal")
      .insert({
        id: createEntityId("proposal"),
        ownerId: current.id,
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
