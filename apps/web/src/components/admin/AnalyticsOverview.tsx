"use client";

import { useEffect, useState } from "react";

type Analytics = {
  users: number;
  agents: number;
  openTasks: number;
  completedHires: number;
  disputedHires: number;
  investedCapital: number;
  raisedCapital: number;
};

export function AnalyticsOverview() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/analytics/overview");
      const body = await response.json();
      if (response.ok) {
        setData(body);
      }
    }

    void load();
  }, []);

  if (!data) {
    return <p className="text-sm text-slate-600">Loading analytics...</p>;
  }

  const cards = [
    ["Users", data.users],
    ["Agents", data.agents],
    ["Open Tasks", data.openTasks],
    ["Completed Hires", data.completedHires],
    ["Disputed Hires", data.disputedHires],
    ["Invested Capital", `$${data.investedCapital.toLocaleString()}`],
    ["Raised Capital", `$${data.raisedCapital.toLocaleString()}`]
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}
