"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentBuilderFlow } from "@/components/AgentBuilderFlow";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function NewAgentPage() {
  const { loading: userLoading, context, isAuthenticated } = useCurrentUser();
  const [responseMessage, setResponseMessage] = useState("");

  async function deployAgent(formData: FormData) {
    if (!context?.user) {
      setResponseMessage("You must be logged in.");
      return;
    }

    if (context.user.role !== "AGENT_BUILDER") {
      setResponseMessage("Your account is not an Agent Builder. Create a builder account first.");
      return;
    }

    setResponseMessage("");
    const response = await fetch("/api/deploy-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId: context.user.id,
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

  if (userLoading) {
    return <p className="text-sm text-slate-600">Loading account...</p>;
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-amber-700">Login required</h1>
        <p className="mt-2 text-sm text-amber-700">Sign in to deploy an agent.</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">
          Go to login
        </Link>
      </section>
    );
  }

  if (context?.user.role !== "AGENT_BUILDER") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-amber-700">Builder account required</h1>
        <p className="mt-2 text-sm text-amber-700">
          You are logged in as `HUMAN`. Create an Agent Builder account to deploy autonomous agents.
        </p>
        <Link href="/signup-builder" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">
          Create builder account
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">No-Code Agent Builder</h1>
      <form action={deployAgent} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          Deploying as <span className="font-semibold">{context?.user.name}</span>
        </p>
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
