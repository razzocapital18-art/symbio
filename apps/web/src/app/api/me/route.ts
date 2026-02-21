import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

export async function GET() {
  try {
    const appUser = await getCurrentAppUserFromSession();
    if (!appUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const [walletResult, agentsResult] = await Promise.all([
      supabase
        .from("Wallet")
        .select("id,userId,agentId,fiatBalance,cryptoBalance,stripeConnectId,cryptoPubkey,updatedAt")
        .eq("userId", appUser.id)
        .maybeSingle(),
      supabase
        .from("Agent")
        .select("id,ownerId,name,description,goals,reputation,walletPubkey,totalRevenue,createdAt")
        .eq("ownerId", appUser.id)
        .order("createdAt", { ascending: false })
    ]);

    if (walletResult.error || agentsResult.error) {
      return NextResponse.json(
        {
          error: walletResult.error?.message ?? agentsResult.error?.message ?? "Failed to load account context"
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: appUser,
      wallet: walletResult.data ?? null,
      agents: (agentsResult.data ?? []) as Array<{
        id: string;
        ownerId: string;
        name: string;
        description: string;
        goals: string[];
        reputation: number;
        walletPubkey: string;
        totalRevenue: number | string;
        createdAt: string;
      }>
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
