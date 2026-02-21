import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

const schema = z.object({
  hireId: z.string()
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "release-payment");
  if (limited) {
    return limited;
  }

  try {
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());
    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? 800);

    const hireResult = await supabase
      .from("Hire")
      .select("id,taskId,status,offer,workerUserId,workerAgentId")
      .eq("id", payload.hireId)
      .maybeSingle();

    if (hireResult.error) {
      return NextResponse.json({ error: hireResult.error.message }, { status: 400 });
    }

    const hire = hireResult.data as {
      id: string;
      taskId: string;
      status: string;
      offer: number | string;
      workerUserId: string | null;
      workerAgentId: string | null;
    } | null;

    if (!hire || hire.status !== "ACTIVE") {
      return NextResponse.json({ error: "Hire not active" }, { status: 400 });
    }

    const taskLookup = await supabase
      .from("Task")
      .select("id,posterUserId,posterAgentId")
      .eq("id", hire.taskId)
      .maybeSingle();

    if (taskLookup.error || !taskLookup.data) {
      return NextResponse.json({ error: taskLookup.error?.message ?? "Task not found" }, { status: 404 });
    }

    const task = taskLookup.data as { id: string; posterUserId: string | null; posterAgentId: string | null };
    let authorized = task.posterUserId === current.id;
    if (!authorized && task.posterAgentId) {
      const agentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", task.posterAgentId)
        .maybeSingle();

      if (agentLookup.error) {
        return NextResponse.json({ error: agentLookup.error.message }, { status: 400 });
      }

      const agent = agentLookup.data as { id: string; ownerId: string } | null;
      authorized = agent?.ownerId === current.id;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Only task owner can release escrow" }, { status: 403 });
    }

    const gross = Number(hire.offer);
    const fee = (gross * platformFeeBps) / 10000;
    const net = Math.max(0, gross - fee);

    const [hireUpdate, taskUpdate] = await Promise.all([
      supabase.from("Hire").update({ status: "COMPLETED" } as never).eq("id", hire.id),
      supabase.from("Task").update({ status: "COMPLETED" } as never).eq("id", hire.taskId)
    ]);

    if (hireUpdate.error || taskUpdate.error) {
      return NextResponse.json({ error: hireUpdate.error?.message ?? taskUpdate.error?.message }, { status: 400 });
    }

    let walletOwnerFilter: { column: "userId" | "agentId"; value: string } | null = null;
    if (hire.workerUserId) {
      walletOwnerFilter = { column: "userId", value: hire.workerUserId };
    } else if (hire.workerAgentId) {
      walletOwnerFilter = { column: "agentId", value: hire.workerAgentId };
    }

    if (walletOwnerFilter) {
      const walletLookup = await supabase
        .from("Wallet")
        .select("id,fiatBalance")
        .eq(walletOwnerFilter.column, walletOwnerFilter.value)
        .maybeSingle();

      if (walletLookup.error || !walletLookup.data) {
        return NextResponse.json({ error: walletLookup.error?.message ?? "Worker wallet not found" }, { status: 400 });
      }

      const workerWallet = walletLookup.data as { id: string; fiatBalance: number | string | null };
      const nextFiat = Number(workerWallet.fiatBalance ?? 0) + net;
      const walletUpdate = await supabase
        .from("Wallet")
        .update({ fiatBalance: nextFiat } as never)
        .eq("id", workerWallet.id);

      if (walletUpdate.error) {
        return NextResponse.json({ error: walletUpdate.error.message }, { status: 400 });
      }

      const txInsert = await supabase.from("WalletTransaction").insert({
        id: createEntityId("wtx"),
        walletId: workerWallet.id,
        amount: net,
        direction: "CREDIT",
        method: "FIAT",
        reference: `hire-${hire.id}`
      } as never);

      if (txInsert.error) {
        return NextResponse.json({ error: txInsert.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ hireId: hire.id, netPaid: net, feeCharged: fee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
