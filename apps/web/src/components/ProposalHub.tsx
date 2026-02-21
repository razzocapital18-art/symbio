"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type Proposal = {
  id: string;
  ownerId: string;
  agentId: string;
  title: string;
  description: string;
  goalAmount: number | string | null;
  raisedAmount: number | string | null;
  revenueSharePct: number;
  status: "OPEN" | "FUNDED" | "CLOSED";
  createdAt: string;
};

export function ProposalHub() {
  const { context, isAuthenticated } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [message, setMessage] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const agents = useMemo(() => context?.agents ?? [], [context?.agents]);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/proposals", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to load proposals");
      setLoading(false);
      return;
    }

    setProposals((body.proposals ?? []) as Proposal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    if (!selectedAgentId && agents[0]?.id) {
      setSelectedAgentId(agents[0].id);
    }
  }, [selectedAgentId, agents]);

  const totals = useMemo(
    () =>
      proposals.reduce(
        (acc, proposal) => {
          acc.goal += Number(proposal.goalAmount ?? 0);
          acc.raised += Number(proposal.raisedAmount ?? 0);
          return acc;
        },
        { goal: 0, raised: 0 }
      ),
    [proposals]
  );

  async function createProposal(formData: FormData) {
    if (!context?.user) {
      setMessage("Login required");
      return;
    }
    if (!selectedAgentId) {
      setMessage("Select a builder-owned agent");
      return;
    }

    setMessage("");
    const response = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: selectedAgentId,
        title: String(formData.get("title")),
        description: String(formData.get("description")),
        goalAmount: Number(formData.get("goalAmount")),
        revenueSharePct: Number(formData.get("revenueSharePct"))
      })
    });

    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to create proposal");
      return;
    }

    setMessage(`Proposal created: ${body.proposal.title}`);
    await loadProposals();
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading fundraising hub...</p>;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-glass">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold">Fundraising Ventures</h1>
            <Link href="/invest" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
              Open Investor Console
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Launch investment proposals, track raised capital, and route payout commitments.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Portfolio Goal</p>
              <p className="mt-2 text-2xl font-semibold">${totals.goal.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Capital Raised</p>
              <p className="mt-2 text-2xl font-semibold">${totals.raised.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {proposals.map((proposal) => {
            const goal = Number(proposal.goalAmount ?? 0);
            const raised = Number(proposal.raisedAmount ?? 0);
            const progressPct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;

            return (
              <article key={proposal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{proposal.title}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{proposal.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{proposal.description}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <p>Raised: ${raised.toLocaleString()}</p>
                  <p>Goal: ${goal.toLocaleString()}</p>
                  <p>Revenue Share: {proposal.revenueSharePct}%</p>
                  <p>Progress: {progressPct.toFixed(1)}%</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h2 className="text-lg font-semibold">Create Venture Proposal</h2>
          {!isAuthenticated ? (
            <p className="mt-2 text-sm text-slate-600">
              Login first, then deploy an agent and launch fundraising.
            </p>
          ) : context?.user.role !== "AGENT_BUILDER" ? (
            <p className="mt-2 text-sm text-slate-600">
              This flow is for Agent Builder accounts.
            </p>
          ) : agents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Deploy an agent first in the No-Code Builder.
            </p>
          ) : (
            <form action={createProposal} className="mt-3 grid gap-3">
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <input required name="title" placeholder="Venture title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea
                required
                name="description"
                placeholder="What this raise funds and how returns are generated"
                className="min-h-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                required
                min="1"
                type="number"
                name="goalAmount"
                placeholder="Goal amount (USD)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                required
                min="0.1"
                max="90"
                step="0.1"
                type="number"
                name="revenueSharePct"
                placeholder="Revenue share %"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
                Publish Proposal
              </button>
            </form>
          )}
        </section>

        {message ? <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</p> : null}
      </aside>
    </section>
  );
}
