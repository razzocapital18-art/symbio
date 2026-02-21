import { NextRequest, NextResponse } from "next/server";
import { hireSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/http";
import { createFiatEscrowIntent } from "@/lib/escrow";
import { hireQueue } from "@/lib/queue";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "hire");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = hireSchema.parse(await request.json());
    if (payload.posterId && payload.posterId !== current.id) {
      return NextResponse.json({ error: "Forbidden posterId" }, { status: 403 });
    }

    const taskResult = await supabase
      .from("Task")
      .select("id,status,posterUserId,posterAgentId")
      .eq("id", payload.taskId)
      .maybeSingle();

    if (taskResult.error) {
      return NextResponse.json({ error: taskResult.error.message }, { status: 400 });
    }

    const task = taskResult.data as {
      id: string;
      status: string;
      posterUserId: string | null;
      posterAgentId: string | null;
    } | null;

    if (!task || task.status !== "OPEN") {
      return NextResponse.json({ error: "Task is not open for hiring" }, { status: 400 });
    }

    let canManageTask = task.posterUserId === current.id;
    if (!canManageTask && task.posterAgentId) {
      const posterAgentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", task.posterAgentId)
        .maybeSingle();

      if (posterAgentLookup.error) {
        return NextResponse.json({ error: posterAgentLookup.error.message }, { status: 400 });
      }

      const posterAgent = posterAgentLookup.data as { id: string; ownerId: string } | null;
      canManageTask = posterAgent?.ownerId === current.id;
    }

    if (!canManageTask) {
      return NextResponse.json({ error: "Only the task owner can create a hire" }, { status: 403 });
    }

    if (payload.workerUserId && payload.workerUserId === current.id) {
      return NextResponse.json({ error: "Cannot hire yourself as worker" }, { status: 400 });
    }
    if (payload.workerUserId) {
      const workerLookup = await supabase.from("User").select("id").eq("id", payload.workerUserId).maybeSingle();
      if (workerLookup.error || !workerLookup.data) {
        return NextResponse.json({ error: workerLookup.error?.message ?? "Worker user not found" }, { status: 404 });
      }
    }
    if (payload.workerAgentId) {
      const workerAgentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", payload.workerAgentId)
        .maybeSingle();
      if (workerAgentLookup.error || !workerAgentLookup.data) {
        return NextResponse.json({ error: workerAgentLookup.error?.message ?? "Worker agent not found" }, { status: 404 });
      }
      const workerAgent = workerAgentLookup.data as { id: string; ownerId: string };
      if (workerAgent.ownerId === current.id) {
        return NextResponse.json({ error: "Cannot hire your own agent as worker" }, { status: 400 });
      }
    }

    const escrowIntent = await createFiatEscrowIntent(Math.round(payload.offer * 100));
    const hireId = createEntityId("hire");

    const hireInsert = await supabase
      .from("Hire")
      .insert({
        id: hireId,
        taskId: payload.taskId,
        posterId: current.id,
        workerUserId: payload.workerUserId || null,
        workerAgentId: payload.workerAgentId || null,
        offer: payload.offer,
        status: "ACTIVE",
        escrowRef: escrowIntent.id
      } as never);

    if (hireInsert.error) {
      return NextResponse.json({ error: hireInsert.error?.message ?? "Failed to create hire" }, { status: 400 });
    }

    const taskUpdate = await supabase.from("Task").update({ status: "IN_PROGRESS" } as never).eq("id", payload.taskId);
    if (taskUpdate.error) {
      return NextResponse.json({ error: taskUpdate.error.message }, { status: 400 });
    }

    await hireQueue.add("hire-created", {
      hireId,
      taskId: payload.taskId,
      posterId: current.id
    });

    const hireLookup = await supabase
      .from("Hire")
      .select("id,taskId,posterId,workerUserId,workerAgentId,status,offer,escrowRef,createdAt")
      .eq("id", hireId)
      .maybeSingle();

    if (hireLookup.error || !hireLookup.data) {
      return NextResponse.json({ error: hireLookup.error?.message ?? "Failed to load created hire" }, { status: 400 });
    }

    return NextResponse.json({ hire: hireLookup.data, escrow: escrowIntent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
