import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  const agents = await prisma.agent.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { goals: { has: query } }
          ]
        }
      : undefined,
    take: 30,
    orderBy: { reputation: "desc" }
  });

  return NextResponse.json({ agents });
}
