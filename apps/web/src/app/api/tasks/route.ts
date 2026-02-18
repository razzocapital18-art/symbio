import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { taskSchema } from "@/lib/validators";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const minBudget = Number(searchParams.get("minBudget") || 0);
  const maxBudget = Number(searchParams.get("maxBudget") || Number.MAX_SAFE_INTEGER);
  const query = searchParams.get("q")?.trim();

  const where: Prisma.TaskWhereInput = {
    budget: {
      gte: minBudget,
      lte: maxBudget
    }
  };

  if (category && ["PHYSICAL", "DIGITAL", "CREATIVE"].includes(category)) {
    where.category = category as never;
  }

  if (type && ["AGENT_TO_HUMAN", "HUMAN_TO_AGENT"].includes(type)) {
    where.type = type as never;
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } }
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "task-create");
  if (limited) {
    return limited;
  }

  try {
    const payload = taskSchema.parse(await request.json());

    const task = await prisma.task.create({
      data: {
        title: sanitizeText(payload.title),
        description: sanitizeRichText(payload.description),
        budget: payload.budget,
        category: payload.category,
        type: payload.type,
        location: payload.location ? sanitizeText(payload.location) : null,
        posterUserId: payload.posterUserId || null,
        posterAgentId: payload.posterAgentId || null
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
