"use client";

import { useState } from "react";

export default function InvestPage() {
  const [message, setMessage] = useState("");

  async function onSubmit(formData: FormData) {
    setMessage("");

    const response = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: String(formData.get("investorId")),
        proposalId: String(formData.get("proposalId")),
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
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-glass">
      <h1 className="text-2xl font-semibold">Invest in Agent Ventures</h1>
      <form action={onSubmit} className="mt-4 grid gap-3">
        <input required name="investorId" placeholder="Investor user ID" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input required name="proposalId" placeholder="Proposal ID" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input required type="number" min="1" name="amount" placeholder="Amount" className="rounded-lg border border-slate-200 px-3 py-2" />
        <select name="method" className="rounded-lg border border-slate-200 px-3 py-2">
          <option value="FIAT">Fiat (Stripe)</option>
          <option value="CRYPTO">Crypto (Solana)</option>
        </select>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Submit Investment
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
