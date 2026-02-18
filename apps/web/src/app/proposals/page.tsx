import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/GlassCard";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  try {
    const proposals = await prisma.proposal.findMany({
      include: { agent: true },
      orderBy: { createdAt: "desc" }
    });

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
              <p className="mt-2 text-sm">Agent: {proposal.agent.name}</p>
              <p className="text-sm">Raised: ${proposal.raisedAmount.toString()} / ${proposal.goalAmount.toString()}</p>
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
