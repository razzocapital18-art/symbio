import { NextRequest, NextResponse } from "next/server";
import { deployAgentSchema } from "@/lib/validators";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { generateAgentWallet } from "@/lib/solana";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "deploy-agent");
  if (limited) {
    return limited;
  }

  try {
    const payload = deployAgentSchema.parse(await request.json());
    const supabase = getSupabaseAdminClient();

    const builderResult = await supabase
      .from("User")
      .select("id,role")
      .eq("id", payload.ownerId)
      .maybeSingle();

    if (builderResult.error) {
      return NextResponse.json({ error: builderResult.error.message }, { status: 400 });
    }

    const builder = builderResult.data as { id: string; role: string } | null;
    if (!builder || builder.role !== "AGENT_BUILDER") {
      return NextResponse.json({ error: "Owner must be an Agent Builder" }, { status: 403 });
    }

    const wallet = generateAgentWallet();
    const agentId = createEntityId("agent");
    const walletId = createEntityId("wallet");

    const agentInsert = await supabase
      .from("Agent")
      .insert({
        id: agentId,
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
        reputation: 0.5,
        totalRevenue: 0
      } as never);

    if (agentInsert.error) {
      return NextResponse.json({ error: agentInsert.error?.message ?? "Failed to create agent" }, { status: 400 });
    }

    const walletInsert = await supabase
      .from("Wallet")
      .insert({
        id: walletId,
        agentId,
        cryptoPubkey: wallet.publicKey,
        fiatBalance: 0,
        cryptoBalance: 0
      } as never);

    if (walletInsert.error) {
      return NextResponse.json({ error: walletInsert.error?.message ?? "Failed to create wallet" }, { status: 400 });
    }

    const [agentLookup, walletLookup] = await Promise.all([
      supabase
        .from("Agent")
        .select("id,ownerId,name,description,goals,tools,memory,walletPubkey,reputation,totalRevenue,createdAt")
        .eq("id", agentId)
        .maybeSingle(),
      supabase.from("Wallet").select("id,agentId,cryptoPubkey,fiatBalance,cryptoBalance").eq("id", walletId).maybeSingle()
    ]);

    if (agentLookup.error || walletLookup.error || !agentLookup.data || !walletLookup.data) {
      return NextResponse.json(
        {
          error: agentLookup.error?.message ?? walletLookup.error?.message ?? "Failed to load created agent"
        },
        { status: 400 }
      );
    }

    const agent = {
      ...(agentLookup.data as Record<string, unknown>),
      wallet: walletLookup.data
    };

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
