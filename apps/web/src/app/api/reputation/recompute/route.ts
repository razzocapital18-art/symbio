import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bayesianReputationScore } from "@/lib/reputation";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

const schema = z.object({
  userId: z.string().optional(),
  agentId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());
    if (!payload.userId && !payload.agentId) {
      return NextResponse.json({ error: "userId or agentId required" }, { status: 400 });
    }

    if (payload.userId) {
      if (payload.userId !== current.id && current.role !== "AGENT_BUILDER") {
        return NextResponse.json({ error: "Forbidden user target" }, { status: 403 });
      }

      const hiresResult = await supabase
        .from("Hire")
        .select("status,reviewRating")
        .eq("workerUserId", payload.userId);

      if (hiresResult.error) {
        return NextResponse.json({ error: hiresResult.error.message }, { status: 400 });
      }

      const hires = (hiresResult.data ?? []) as Array<{ status: string; reviewRating: number | null }>;

      const wins = hires.filter((hire) => hire.status === "COMPLETED" && (hire.reviewRating ?? 4) >= 4).length;
      const losses = hires.length - wins;
      const reputation = bayesianReputationScore(wins, losses);

      const updateResult = await supabase
        .from("User")
        .update({ reputation } as never)
        .eq("id", payload.userId);

      if (updateResult.error) {
        return NextResponse.json({ error: updateResult.error?.message ?? "Failed to update user reputation" }, { status: 400 });
      }

      const userLookup = await supabase.from("User").select("id,reputation").eq("id", payload.userId).maybeSingle();
      if (userLookup.error || !userLookup.data) {
        return NextResponse.json({ error: userLookup.error?.message ?? "Failed to load user reputation" }, { status: 400 });
      }

      const user = userLookup.data as { id: string; reputation: number };
      return NextResponse.json({ entity: "user", reputation: user.reputation });
    }

    if (payload.agentId) {
      const agentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", payload.agentId)
        .maybeSingle();

      if (agentLookup.error) {
        return NextResponse.json({ error: agentLookup.error.message }, { status: 400 });
      }

      const agent = agentLookup.data as { id: string; ownerId: string } | null;
      if (!agent || (agent.ownerId !== current.id && current.role !== "AGENT_BUILDER")) {
        return NextResponse.json({ error: "Forbidden agent target" }, { status: 403 });
      }
    }

    const hiresResult = await supabase
      .from("Hire")
      .select("status,reviewRating")
      .eq("workerAgentId", payload.agentId as string);

    if (hiresResult.error) {
      return NextResponse.json({ error: hiresResult.error.message }, { status: 400 });
    }

    const hires = (hiresResult.data ?? []) as Array<{ status: string; reviewRating: number | null }>;

    const wins = hires.filter((hire) => hire.status === "COMPLETED" && (hire.reviewRating ?? 4) >= 4).length;
    const losses = hires.length - wins;
    const reputation = bayesianReputationScore(wins, losses);

    const updateResult = await supabase
      .from("Agent")
      .update({ reputation } as never)
      .eq("id", payload.agentId as string);

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error?.message ?? "Failed to update agent reputation" }, { status: 400 });
    }

    const agentLookup = await supabase.from("Agent").select("id,reputation").eq("id", payload.agentId as string).maybeSingle();
    if (agentLookup.error || !agentLookup.data) {
      return NextResponse.json({ error: agentLookup.error?.message ?? "Failed to load agent reputation" }, { status: 400 });
    }

    const agent = agentLookup.data as { id: string; reputation: number };
    return NextResponse.json({ entity: "agent", reputation: agent.reputation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
