import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

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
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (current.role !== "AGENT_BUILDER") {
      return NextResponse.json({ error: "Only Agent Builders can orchestrate swarms" }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    if (payload.leaderAgentId === payload.memberAgentId) {
      return NextResponse.json({ error: "Agent cannot hire itself" }, { status: 400 });
    }

    const [leaderAgentLookup, memberAgentLookup] = await Promise.all([
      supabase.from("Agent").select("id,ownerId").eq("id", payload.leaderAgentId).maybeSingle(),
      supabase.from("Agent").select("id").eq("id", payload.memberAgentId).maybeSingle()
    ]);

    if (leaderAgentLookup.error || memberAgentLookup.error) {
      return NextResponse.json(
        { error: leaderAgentLookup.error?.message ?? memberAgentLookup.error?.message },
        { status: 400 }
      );
    }

    const leaderAgent = leaderAgentLookup.data as { id: string; ownerId: string } | null;
    if (!leaderAgent || leaderAgent.ownerId !== current.id) {
      return NextResponse.json({ error: "Only leader owner can create swarm links" }, { status: 403 });
    }
    if (!memberAgentLookup.data) {
      return NextResponse.json({ error: "Member agent not found" }, { status: 404 });
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
