import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bayesianReputationScore } from "@/lib/reputation";

const schema = z.object({
  userId: z.string().optional(),
  agentId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const payload = schema.parse(await request.json());
    if (!payload.userId && !payload.agentId) {
      return NextResponse.json({ error: "userId or agentId required" }, { status: 400 });
    }

    if (payload.userId) {
      const hires = await prisma.hire.findMany({
        where: { workerUserId: payload.userId },
        select: { status: true, reviewRating: true }
      });

      const wins = hires.filter((hire) => hire.status === "COMPLETED" && (hire.reviewRating ?? 4) >= 4).length;
      const losses = hires.length - wins;
      const reputation = bayesianReputationScore(wins, losses);

      const user = await prisma.user.update({
        where: { id: payload.userId },
        data: { reputation }
      });

      return NextResponse.json({ entity: "user", reputation: user.reputation });
    }

    const hires = await prisma.hire.findMany({
      where: { workerAgentId: payload.agentId },
      select: { status: true, reviewRating: true }
    });

    const wins = hires.filter((hire) => hire.status === "COMPLETED" && (hire.reviewRating ?? 4) >= 4).length;
    const losses = hires.length - wins;
    const reputation = bayesianReputationScore(wins, losses);

    const agent = await prisma.agent.update({
      where: { id: payload.agentId },
      data: { reputation }
    });

    return NextResponse.json({ entity: "agent", reputation: agent.reputation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
