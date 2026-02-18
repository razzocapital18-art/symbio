import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";
import { reportStatusUpdateSchema } from "@/lib/validators";

export async function GET() {
  const reports = await prisma.report.findMany({
    include: {
      task: { select: { id: true, title: true, status: true } },
      reporter: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ reports });
}

export async function PATCH(request: NextRequest) {
  const limited = await enforceRateLimit(request, "admin-report-update");
  if (limited) {
    return limited;
  }

  try {
    const payload = reportStatusUpdateSchema.parse(await request.json());

    const report = await prisma.report.update({
      where: { id: payload.reportId },
      data: { status: payload.status }
    });

    if (payload.status === "RESOLVED") {
      await prisma.task.update({
        where: { id: report.taskId },
        data: { status: "OPEN" }
      });
    }

    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
