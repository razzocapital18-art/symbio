"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type TaskComposerProps = {
  onTaskCreated?: () => void | Promise<void>;
};

export function TaskComposer({ onTaskCreated }: TaskComposerProps) {
  const { loading: userLoading, context, isAuthenticated } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [identity, setIdentity] = useState<"HUMAN" | "AGENT">("HUMAN");
  const [agentId, setAgentId] = useState("");

  const agents = useMemo(() => context?.agents ?? [], [context?.agents]);
  const firstAgentId = useMemo(() => agents[0]?.id ?? "", [agents]);
  const canPostAsAgent = agents.length > 0;

  useEffect(() => {
    if (canPostAsAgent && !agentId && firstAgentId) {
      setAgentId(firstAgentId);
    }
  }, [canPostAsAgent, agentId, firstAgentId]);

  async function submitTask(formData: FormData) {
    if (!context?.user) {
      setMessage("You must be logged in to post a task.");
      return;
    }

    if (identity === "AGENT" && !agentId) {
      setMessage("Select an agent identity before posting.");
      return;
    }

    setLoading(true);
    setMessage("");
    const payload = {
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      budget: Number(formData.get("budget")),
      category: String(formData.get("category")),
      type: identity === "AGENT" ? "AGENT_TO_HUMAN" : "HUMAN_TO_AGENT",
      location: String(formData.get("location") || ""),
      posterUserId: identity === "HUMAN" ? context.user.id : "",
      posterAgentId: identity === "AGENT" ? agentId : ""
    };

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error || "Failed to create task");
      return;
    }

    setMessage(`Task created: ${result.task.title}`);
    await onTaskCreated?.();
  }

  if (userLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-glass">
        <p className="text-sm text-slate-600">Loading account context...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-lg font-semibold text-amber-700">Login required</h2>
        <p className="mt-2 text-sm text-amber-700">Sign in first so tasks are linked to your verified profile.</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <form action={submitTask} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-glass">
      <h2 className="text-lg font-semibold">Post Task</h2>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-700">Post as</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIdentity("HUMAN")}
            className={`rounded-lg px-3 py-2 text-sm ${identity === "HUMAN" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
          >
            {context?.user.name} (Human)
          </button>
          <button
            type="button"
            onClick={() => setIdentity("AGENT")}
            disabled={!canPostAsAgent}
            className={`rounded-lg px-3 py-2 text-sm ${identity === "AGENT" ? "bg-slate-900 text-white" : "bg-white text-slate-700"} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Agent Identity
          </button>
        </div>
        {identity === "AGENT" ? (
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <option value="">Select deployed agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <input name="title" required placeholder="Title" className="rounded-lg border border-slate-200 px-3 py-2" />
      <textarea
        name="description"
        required
        placeholder="Describe scope, verification needs, deliverables"
        className="min-h-28 rounded-lg border border-slate-200 px-3 py-2"
      />
      <input name="budget" type="number" min="1" required placeholder="Budget" className="rounded-lg border border-slate-200 px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="category" defaultValue="DIGITAL" className="rounded-lg border border-slate-200 px-3 py-2">
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
          <option value="CREATIVE">Creative</option>
        </select>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Direction: {identity === "AGENT" ? "Agent -> Human" : "Human -> Agent"}
        </div>
      </div>
      <input name="location" placeholder="Location (optional)" className="rounded-lg border border-slate-200 px-3 py-2" />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Posting..." : "Publish Task"}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
