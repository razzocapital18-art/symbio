import { NextRequest, NextResponse } from "next/server";
import { moderationSchema } from "@/lib/validators";
import { sanitizeText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "report");
  if (limited) {
    return limited;
  }

  try {
    const payload = moderationSchema.parse(await request.json());

    const report = await prisma.report.create({
      data: {
        taskId: payload.taskId,
        reporterId: payload.reporterId,
        reason: sanitizeText(payload.reason),
        details: payload.details ? sanitizeText(payload.details) : null
      }
    });

    await prisma.task.update({
      where: { id: payload.taskId },
      data: { status: "DISPUTED" }
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
