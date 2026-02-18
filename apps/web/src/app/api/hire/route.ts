import { NextRequest, NextResponse } from "next/server";
import { hireSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/http";
import { createFiatEscrowIntent } from "@/lib/escrow";
import { hireQueue } from "@/lib/queue";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "hire");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = hireSchema.parse(await request.json());
    const taskResult = await supabase
      .from("Task")
      .select("id,status")
      .eq("id", payload.taskId)
      .maybeSingle();

    if (taskResult.error) {
      return NextResponse.json({ error: taskResult.error.message }, { status: 400 });
    }

    const task = taskResult.data as { id: string; status: string } | null;

    if (!task || task.status !== "OPEN") {
      return NextResponse.json({ error: "Task is not open for hiring" }, { status: 400 });
    }

    const escrowIntent = await createFiatEscrowIntent(Math.round(payload.offer * 100));
    const hireId = createEntityId("hire");

    const hireInsert = await supabase
      .from("Hire")
      .insert({
        id: hireId,
        taskId: payload.taskId,
        posterId: payload.posterId,
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
      posterId: payload.posterId
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
