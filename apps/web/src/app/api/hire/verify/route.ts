import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  hireId: z.string(),
  approved: z.boolean(),
  reviewerNotes: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    const payload = schema.parse(await request.json());

    const hire = await prisma.hire.update({
      where: { id: payload.hireId },
      data: {
        status: payload.approved ? "COMPLETED" : "DISPUTED",
        reviewComment: payload.reviewerNotes ?? null,
        reviewRating: payload.approved ? 5 : 1
      }
    });

    await prisma.task.update({
      where: { id: hire.taskId },
      data: { status: payload.approved ? "COMPLETED" : "DISPUTED" }
    });

    return NextResponse.json({ hire });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
