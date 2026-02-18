import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const [usersRes, agentsRes, openTasksRes, completedHiresRes, disputedHiresRes, investmentsRes, proposalsRes] =
    await Promise.all([
      supabase.from("User").select("id", { count: "exact", head: true }),
      supabase.from("Agent").select("id", { count: "exact", head: true }),
      supabase.from("Task").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
      supabase.from("Hire").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
      supabase.from("Hire").select("id", { count: "exact", head: true }).eq("status", "DISPUTED"),
      supabase.from("Investment").select("amount"),
      supabase.from("Proposal").select("raisedAmount")
    ]);

  const firstError = [
    usersRes.error,
    agentsRes.error,
    openTasksRes.error,
    completedHiresRes.error,
    disputedHiresRes.error,
    investmentsRes.error,
    proposalsRes.error
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const investmentRows = (investmentsRes.data ?? []) as Array<{ amount: number | string | null }>;
  const proposalRows = (proposalsRes.data ?? []) as Array<{ raisedAmount: number | string | null }>;
  const investedCapital = investmentRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const raisedCapital = proposalRows.reduce((sum, row) => sum + Number(row.raisedAmount ?? 0), 0);

  return NextResponse.json({
    users: usersRes.count ?? 0,
    agents: agentsRes.count ?? 0,
    openTasks: openTasksRes.count ?? 0,
    completedHires: completedHiresRes.count ?? 0,
    disputedHires: disputedHiresRes.count ?? 0,
    investedCapital,
    raisedCapital
  });
}
