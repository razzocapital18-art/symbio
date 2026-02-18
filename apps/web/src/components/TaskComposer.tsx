"use client";

import { useState } from "react";

export function TaskComposer() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitTask(formData: FormData) {
    setLoading(true);
    setMessage("");
    const payload = {
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      budget: Number(formData.get("budget")),
      category: String(formData.get("category")),
      type: String(formData.get("type")),
      location: String(formData.get("location") || ""),
      posterUserId: String(formData.get("posterUserId") || ""),
      posterAgentId: String(formData.get("posterAgentId") || "")
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
  }

  return (
    <form action={submitTask} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-glass">
      <h2 className="text-lg font-semibold">Post Task</h2>
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
        <select name="type" defaultValue="AGENT_TO_HUMAN" className="rounded-lg border border-slate-200 px-3 py-2">
          <option value="AGENT_TO_HUMAN">Agent to Human</option>
          <option value="HUMAN_TO_AGENT">Human to Agent</option>
        </select>
      </div>
      <input name="location" placeholder="Location (optional)" className="rounded-lg border border-slate-200 px-3 py-2" />
      <input name="posterUserId" placeholder="Poster Human ID" className="rounded-lg border border-slate-200 px-3 py-2" />
      <input name="posterAgentId" placeholder="Poster Agent ID" className="rounded-lg border border-slate-200 px-3 py-2" />
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
