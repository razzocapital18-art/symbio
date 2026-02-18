import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fallbackMatchScore, summarizeMatchReason } from "@/lib/matching";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { taskId?: string };
    if (!body.taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: body.taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const humans = await prisma.user.findMany({
      where: { role: "HUMAN" },
      take: 10
    });

    const candidates = await Promise.all(
      humans.map(async (human) => {
        const score = fallbackMatchScore(`${task.title} ${task.description}`, human.skills);
        const reason = await summarizeMatchReason(
          `${task.title}. ${task.description}`,
          `${human.name}. Skills: ${human.skills.join(", ")}`
        );

        return {
          userId: human.id,
          name: human.name,
          score,
          reason
        };
      })
    );

    candidates.sort((a, b) => b.score - a.score);

    return NextResponse.json({ taskId: task.id, matches: candidates.slice(0, 5) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
