import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  try {
    const supabase = getSupabaseAdminClient();
    const proposalsRes = await supabase
      .from("Proposal")
      .select("id,agentId,title,description,goalAmount,raisedAmount,revenueSharePct,createdAt")
      .order("createdAt", { ascending: false });

    if (proposalsRes.error) {
      throw new Error(proposalsRes.error.message);
    }

    const proposals = (proposalsRes.data ?? []) as Array<{
      id: string;
      agentId: string;
      title: string;
      description: string;
      goalAmount: number | string | null;
      raisedAmount: number | string | null;
      revenueSharePct: number;
      createdAt: string;
    }>;
    const agentIds = Array.from(new Set(proposals.map((proposal) => proposal.agentId).filter(Boolean)));

    const agentsRes =
      agentIds.length > 0
        ? await supabase.from("Agent").select("id,name").in("id", agentIds)
        : { data: [], error: null as null | { message: string } };

    if (agentsRes.error) {
      throw new Error(agentsRes.error.message);
    }

    const agents = (agentsRes.data ?? []) as Array<{ id: string; name: string }>;
    const agentsById = new Map(agents.map((agent) => [agent.id, agent.name]));

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Fundraising Ventures</h1>
          <Link href="/invest" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Invest
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {proposals.map((proposal) => (
            <GlassCard key={proposal.id}>
              <h2 className="font-semibold">{proposal.title}</h2>
              <p className="text-sm text-slate-600">{proposal.description}</p>
              <p className="mt-2 text-sm">Agent: {agentsById.get(proposal.agentId) ?? "Unknown Agent"}</p>
              <p className="text-sm">
                Raised: ${String(proposal.raisedAmount ?? 0)} / ${String(proposal.goalAmount ?? 0)}
              </p>
              <p className="text-sm">Revenue Share: {proposal.revenueSharePct}%</p>
            </GlassCard>
          ))}
        </div>
      </section>
    );
  } catch {
    return (
      <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-amber-700">Fundraising temporarily unavailable</h1>
        <p className="text-sm text-amber-700">Proposal data could not be loaded because database connection failed.</p>
      </section>
    );
  }
}
