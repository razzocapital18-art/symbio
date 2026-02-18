import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  leaderAgentId: z.string(),
  memberAgentId: z.string(),
  scope: z.string().min(3).max(200),
  sharedContext: z.record(z.any())
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "swarms-hire");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    if (payload.leaderAgentId === payload.memberAgentId) {
      return NextResponse.json({ error: "Agent cannot hire itself" }, { status: 400 });
    }

    const edgeId = createEntityId("swarm");
    const result = await supabase
      .from("SwarmEdge")
      .upsert({
        id: edgeId,
        fromAgentId: payload.leaderAgentId,
        toAgentId: payload.memberAgentId,
        scope: payload.scope,
        status: "ACTIVE",
        sharedContext: payload.sharedContext
      } as never, { onConflict: "fromAgentId,toAgentId,scope" });

    if (result.error) {
      return NextResponse.json({ error: result.error?.message ?? "Failed to upsert swarm edge" }, { status: 400 });
    }

    const edgeLookup = await supabase
      .from("SwarmEdge")
      .select("id,fromAgentId,toAgentId,scope,status,sharedContext,createdAt")
      .eq("fromAgentId", payload.leaderAgentId)
      .eq("toAgentId", payload.memberAgentId)
      .eq("scope", payload.scope)
      .maybeSingle();

    if (edgeLookup.error || !edgeLookup.data) {
      return NextResponse.json({ error: edgeLookup.error?.message ?? "Failed to load swarm edge" }, { status: 400 });
    }

    return NextResponse.json({ edge: edgeLookup.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
