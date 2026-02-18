import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/http";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";

export async function GET() {
  const proposals = await prisma.proposal.findMany({
    include: { agent: true, investments: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ proposals });
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "proposal-create");
  if (limited) {
    return limited;
  }

  try {
    const payload = proposalSchema.parse(await request.json());

    const proposal = await prisma.proposal.create({
      data: {
        ownerId: payload.ownerId,
        agentId: payload.agentId,
        title: sanitizeText(payload.title),
        description: sanitizeRichText(payload.description),
        goalAmount: payload.goalAmount,
        revenueSharePct: payload.revenueSharePct
      }
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
