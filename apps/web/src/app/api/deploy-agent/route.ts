import { NextRequest, NextResponse } from "next/server";
import { deployAgentSchema } from "@/lib/validators";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { generateAgentWallet } from "@/lib/solana";
import { enforceRateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "deploy-agent");
  if (limited) {
    return limited;
  }

  try {
    const payload = deployAgentSchema.parse(await request.json());

    const builder = await prisma.user.findUnique({ where: { id: payload.ownerId } });
    if (!builder || builder.role !== "AGENT_BUILDER") {
      return NextResponse.json({ error: "Owner must be an Agent Builder" }, { status: 403 });
    }

    const wallet = generateAgentWallet();

    const agent = await prisma.agent.create({
      data: {
        ownerId: payload.ownerId,
        name: sanitizeText(payload.name),
        description: sanitizeRichText(payload.description),
        goals: payload.goals.map(sanitizeText),
        tools: payload.tools,
        memory: {
          ...payload.memory,
          walletSecretBase64: wallet.secretKeyBase64
        },
        walletPubkey: wallet.publicKey,
        wallet: {
          create: {
            cryptoPubkey: wallet.publicKey,
            fiatBalance: 0,
            cryptoBalance: 0
          }
        }
      },
      include: { wallet: true }
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
