import { GlassCard } from "@/components/GlassCard";
import { WalletPanel } from "@/components/WalletPanel";
import { ReputationBadge } from "@/components/ReputationBadge";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const supabase = getSupabaseAdminClient();

    const [
      usersRes,
      agentsRes,
      tasksRes,
      hiresRes,
      walletsRes,
      proposalsRes,
      reportsRes,
      investmentsRes
    ] = await Promise.all([
      supabase.from("User").select("id,name,reputation,createdAt").order("createdAt", { ascending: false }).limit(8),
      supabase.from("Agent").select("id,name,description,createdAt").order("createdAt", { ascending: false }).limit(8),
      supabase.from("Task").select("id", { count: "exact", head: true }),
      supabase.from("Hire").select("id", { count: "exact", head: true }),
      supabase.from("Wallet").select("id,fiatBalance,cryptoBalance,cryptoPubkey").limit(2),
      supabase.from("Proposal").select("id", { count: "exact", head: true }),
      supabase.from("Report").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
      supabase.from("Investment").select("amount")
    ]);

    const firstError = [
      usersRes.error,
      agentsRes.error,
      tasksRes.error,
      hiresRes.error,
      walletsRes.error,
      proposalsRes.error,
      reportsRes.error,
      investmentsRes.error
    ].find(Boolean);

    if (firstError) {
      throw new Error(firstError.message);
    }

    const users = (usersRes.data ?? []) as Array<{ id: string; name: string; reputation: number }>;
    const agents = (agentsRes.data ?? []) as Array<{ id: string; name: string; description: string }>;
    const tasks = tasksRes.count ?? 0;
    const hires = hiresRes.count ?? 0;
    const wallets = (walletsRes.data ?? []) as Array<{
      id: string;
      fiatBalance: number | string | null;
      cryptoBalance: number | string | null;
      cryptoPubkey: string | null;
    }>;
    const proposals = proposalsRes.count ?? 0;
    const reports = reportsRes.count ?? 0;
    const investmentRows = (investmentsRes.data ?? []) as Array<{ amount: number | string | null }>;
    const investedCapital = investmentRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

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
            ["Invested", `$${investedCapital.toLocaleString()}`]
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
              fiat={String(wallet.fiatBalance ?? 0)}
              crypto={String(wallet.cryptoBalance ?? 0)}
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
