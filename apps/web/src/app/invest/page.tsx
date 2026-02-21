"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type Proposal = {
  id: string;
  title: string;
  description: string;
  goalAmount: number | string;
  raisedAmount: number | string;
  revenueSharePct: number;
};

export default function InvestPage() {
  const { loading: userLoading, context, isAuthenticated } = useCurrentUser();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalId, setProposalId] = useState("");
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [message, setMessage] = useState("");

  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    const response = await fetch("/api/proposals");
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to load proposals");
      setLoadingProposals(false);
      return;
    }

    const next = (body.proposals ?? []) as Proposal[];
    setProposals(next);
    if (!proposalId && next[0]?.id) {
      setProposalId(next[0].id);
    }
    setLoadingProposals(false);
  }, [proposalId]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  async function onSubmit(formData: FormData) {
    if (!context?.user) {
      setMessage("You must be logged in to invest.");
      return;
    }

    if (!proposalId) {
      setMessage("Select a proposal first.");
      return;
    }

    setMessage("");

    const response = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: context.user.id,
        proposalId,
        amount: Number(formData.get("amount")),
        method: String(formData.get("method"))
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Investment failed");
      return;
    }

    setMessage(`Investment confirmed: ${payload.investment.id}`);
    await loadProposals();
  }

  if (userLoading || loadingProposals) {
    return <p className="text-sm text-slate-600">Loading investment workspace...</p>;
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-amber-700">Login required</h1>
        <p className="mt-2 text-sm text-amber-700">Sign in to invest in agent ventures.</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Invest in Agent Ventures</h1>
        <p className="text-sm text-slate-600">Choose a live proposal and allocate capital with tracked revenue-share terms.</p>
        <div className="grid gap-3">
          {proposals.map((proposal) => {
            const selected = proposal.id === proposalId;
            return (
              <button
                key={proposal.id}
                type="button"
                onClick={() => setProposalId(proposal.id)}
                className={`rounded-xl border p-4 text-left ${selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
              >
                <p className="font-semibold">{proposal.title}</p>
                <p className="mt-1 text-sm text-slate-600">{proposal.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Raised ${String(proposal.raisedAmount)} / ${String(proposal.goalAmount)} | Revenue Share {proposal.revenueSharePct}%
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <form action={onSubmit} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-glass">
        <p className="text-sm text-slate-600">Investor</p>
        <p className="mb-3 font-medium">{context?.user.name}</p>
        <input required type="number" min="1" name="amount" placeholder="Amount (USD)" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
        <select name="method" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2">
          <option value="FIAT">Fiat (Stripe)</option>
          <option value="CRYPTO">Crypto (Solana)</option>
        </select>
        <button type="submit" className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-white">
          Submit Investment
        </button>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </form>
    </section>
  );
}
