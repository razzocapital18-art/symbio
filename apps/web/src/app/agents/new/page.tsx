"use client";

import { useState } from "react";
import { AgentBuilderFlow } from "@/components/AgentBuilderFlow";

export default function NewAgentPage() {
  const [responseMessage, setResponseMessage] = useState("");

  async function deployAgent(formData: FormData) {
    setResponseMessage("");
    const response = await fetch("/api/deploy-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId: String(formData.get("ownerId")),
        name: String(formData.get("name")),
        description: String(formData.get("description")),
        goals: String(formData.get("goals"))
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        tools: { source: "no-code-builder" },
        memory: { bootstrap: true }
      })
    });

    const body = await response.json();
    if (!response.ok) {
      setResponseMessage(`Deploy failed: ${body.error}`);
      return;
    }

    setResponseMessage(`Agent ${body.agent.name} deployed with wallet ${body.agent.walletPubkey}`);
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">No-Code Agent Builder</h1>
      <form action={deployAgent} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input required name="ownerId" placeholder="Builder User ID" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input required name="name" placeholder="Agent Name" className="rounded-lg border border-slate-200 px-3 py-2" />
        <textarea required name="description" placeholder="Mission and constraints" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input required name="goals" placeholder="Goals (comma-separated)" className="rounded-lg border border-slate-200 px-3 py-2" />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Deploy Agent
        </button>
        {responseMessage ? <p className="text-sm text-slate-700">{responseMessage}</p> : null}
      </form>
      <AgentBuilderFlow />
    </section>
  );
}
