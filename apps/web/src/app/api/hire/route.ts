import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hireSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/http";
import { createFiatEscrowIntent } from "@/lib/escrow";
import { hireQueue } from "@/lib/queue";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "hire");
  if (limited) {
    return limited;
  }

  try {
    const payload = hireSchema.parse(await request.json());
    const task = await prisma.task.findUnique({ where: { id: payload.taskId } });

    if (!task || task.status !== "OPEN") {
      return NextResponse.json({ error: "Task is not open for hiring" }, { status: 400 });
    }

    const escrowIntent = await createFiatEscrowIntent(Math.round(payload.offer * 100));

    const hire = await prisma.hire.create({
      data: {
        taskId: payload.taskId,
        posterId: payload.posterId,
        workerUserId: payload.workerUserId || null,
        workerAgentId: payload.workerAgentId || null,
        offer: payload.offer,
        status: "ACTIVE",
        escrowRef: escrowIntent.id
      }
    });

    await prisma.task.update({
      where: { id: payload.taskId },
      data: { status: "IN_PROGRESS" }
    });

    await hireQueue.add("hire-created", {
      hireId: hire.id,
      taskId: payload.taskId,
      posterId: payload.posterId
    });

    return NextResponse.json({ hire, escrow: escrowIntent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
