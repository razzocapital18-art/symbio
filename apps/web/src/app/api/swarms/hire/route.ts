import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";

const schema = z.object({
  leaderAgentId: z.string(),
  memberAgentId: z.string(),
  scope: z.string().min(3).max(200),
  sharedContext: z.record(z.any())
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "swarms-hire");
  if (limited) {
    return limited;
  }

  try {
    const payload = schema.parse(await request.json());

    if (payload.leaderAgentId === payload.memberAgentId) {
      return NextResponse.json({ error: "Agent cannot hire itself" }, { status: 400 });
    }

    const edge = await prisma.swarmEdge.upsert({
      where: {
        fromAgentId_toAgentId_scope: {
          fromAgentId: payload.leaderAgentId,
          toAgentId: payload.memberAgentId,
          scope: payload.scope
        }
      },
      create: {
        fromAgentId: payload.leaderAgentId,
        toAgentId: payload.memberAgentId,
        scope: payload.scope,
        status: "ACTIVE",
        sharedContext: payload.sharedContext
      },
      update: {
        status: "ACTIVE",
        sharedContext: payload.sharedContext
      }
    });

    return NextResponse.json({ edge }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
