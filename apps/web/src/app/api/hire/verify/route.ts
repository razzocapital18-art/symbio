import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";
import { enforceRateLimit } from "@/lib/http";

const schema = z.object({
  hireId: z.string(),
  approved: z.boolean(),
  reviewerNotes: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "hire-verify");
  if (limited) {
    return limited;
  }

  try {
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    const hireAccess = await supabase
      .from("Hire")
      .select("id,taskId")
      .eq("id", payload.hireId)
      .maybeSingle();
    if (hireAccess.error || !hireAccess.data) {
      return NextResponse.json({ error: hireAccess.error?.message ?? "Hire not found" }, { status: 404 });
    }

    const hireRef = hireAccess.data as { id: string; taskId: string };
    const taskLookup = await supabase
      .from("Task")
      .select("id,posterUserId,posterAgentId")
      .eq("id", hireRef.taskId)
      .maybeSingle();

    if (taskLookup.error || !taskLookup.data) {
      return NextResponse.json({ error: taskLookup.error?.message ?? "Task not found" }, { status: 404 });
    }

    const task = taskLookup.data as { id: string; posterUserId: string | null; posterAgentId: string | null };
    let authorized = task.posterUserId === current.id;
    if (!authorized && task.posterAgentId) {
      const agentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", task.posterAgentId)
        .maybeSingle();
      if (agentLookup.error) {
        return NextResponse.json({ error: agentLookup.error.message }, { status: 400 });
      }
      const agent = agentLookup.data as { id: string; ownerId: string } | null;
      authorized = agent?.ownerId === current.id;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Only task owner can verify delivery" }, { status: 403 });
    }

    const hireResult = await supabase
      .from("Hire")
      .update({
        status: payload.approved ? "COMPLETED" : "DISPUTED",
        reviewComment: payload.reviewerNotes ?? null,
        reviewRating: payload.approved ? 5 : 1
      } as never)
      .eq("id", payload.hireId);

    if (hireResult.error) {
      return NextResponse.json({ error: hireResult.error?.message ?? "Failed to verify hire" }, { status: 400 });
    }

    const hireLookup = await supabase
      .from("Hire")
      .select("id,taskId,status,reviewComment,reviewRating,updatedAt")
      .eq("id", payload.hireId)
      .maybeSingle();

    if (hireLookup.error || !hireLookup.data) {
      return NextResponse.json({ error: hireLookup.error?.message ?? "Failed to load updated hire" }, { status: 400 });
    }

    const hire = hireLookup.data as {
      id: string;
      taskId: string;
      status: string;
      reviewComment: string | null;
      reviewRating: number | null;
      updatedAt: string;
    };

    const taskUpdate = await supabase
      .from("Task")
      .update({ status: payload.approved ? "COMPLETED" : "DISPUTED" } as never)
      .eq("id", hire.taskId);

    if (taskUpdate.error) {
      return NextResponse.json({ error: taskUpdate.error.message }, { status: 400 });
    }

    return NextResponse.json({ hire });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
