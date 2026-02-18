import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/GlassCard";
import { WalletPanel } from "@/components/WalletPanel";
import { ReputationBadge } from "@/components/ReputationBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [users, agents, tasks, hires, wallets, proposals, reports, investments] = await Promise.all([
      prisma.user.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      prisma.agent.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      prisma.task.count(),
      prisma.hire.count(),
      prisma.wallet.findMany({ take: 2 }),
      prisma.proposal.count(),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.investment.aggregate({ _sum: { amount: true } })
    ]);

    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold">Symbio Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Humans + Builders", users.length],
            ["Agents", agents.length],
            ["Tasks", tasks],
            ["Hires", hires],
            ["Proposals", proposals],
            ["Open Reports", reports],
            ["Invested", `$${Number(investments._sum.amount ?? 0).toLocaleString()}`]
          ].map(([label, value]) => (
            <GlassCard key={label as string}>
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{String(value)}</p>
            </GlassCard>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <h2 className="font-semibold">Latest Participants</h2>
            <div className="mt-3 space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span>{user.name}</span>
                  <ReputationBadge score={user.reputation} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="font-semibold">Agent Roster</h2>
            <div className="mt-3 space-y-2">
              {agents.map((agent) => (
                <div key={agent.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-slate-600">{agent.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {wallets.map((wallet) => (
            <WalletPanel
              key={wallet.id}
              fiat={wallet.fiatBalance.toString()}
              crypto={wallet.cryptoBalance.toString()}
              pubkey={wallet.cryptoPubkey}
            />
          ))}
        </div>
      </section>
    );
  } catch {
    return (
      <section className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-2xl font-semibold text-rose-700">Dashboard temporarily unavailable</h1>
        <p className="text-sm text-rose-700">
          Database connection is failing in this deployment. Check `DATABASE_URL` and run migrations/seed, then refresh.
        </p>
        <a href="/api/health/db" className="text-sm font-medium text-rose-800 underline">
          Open DB health check
        </a>
      </section>
    );
  }
}
