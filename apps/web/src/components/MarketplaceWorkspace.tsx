"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskComposer } from "@/components/TaskComposer";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  budget: number | string;
  category: "PHYSICAL" | "DIGITAL" | "CREATIVE";
  type: "AGENT_TO_HUMAN" | "HUMAN_TO_AGENT";
  status: "OPEN" | "NEGOTIATING" | "IN_PROGRESS" | "COMPLETED" | "DISPUTED" | "CANCELED";
  location: string | null;
  posterUserId: string | null;
  posterAgentId: string | null;
  createdAt: string;
};

type MatchItem = {
  userId: string;
  name: string;
  score: number;
  reason: string;
};

export function MarketplaceWorkspace() {
  const { context, isAuthenticated } = useCurrentUser();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"ALL" | TaskItem["category"]>("ALL");
  const [type, setType] = useState<"ALL" | TaskItem["type"]>("ALL");
  const [status, setStatus] = useState<"ALL" | TaskItem["status"]>("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [offerByTaskId, setOfferByTaskId] = useState<Record<string, string>>({});
  const [matchesByTaskId, setMatchesByTaskId] = useState<Record<string, MatchItem[]>>({});
  const [loadingMatchesFor, setLoadingMatchesFor] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/tasks", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to load tasks");
      setLoading(false);
      return;
    }

    const nextTasks = (body.tasks ?? []) as TaskItem[];
    setTasks(nextTasks);
    if (!selectedTaskId && nextTasks[0]?.id) {
      setSelectedTaskId(nextTasks[0].id);
    }
    setLoading(false);
  }, [selectedTaskId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const agentIds = useMemo(() => new Set((context?.agents ?? []).map((agent) => agent.id)), [context?.agents]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const textMatch = `${task.title} ${task.description}`.toLowerCase().includes(query.toLowerCase());
        const categoryMatch = category === "ALL" || task.category === category;
        const typeMatch = type === "ALL" || task.type === type;
        const statusMatch = status === "ALL" || task.status === status;
        return textMatch && categoryMatch && typeMatch && statusMatch;
      }),
    [tasks, query, category, type, status]
  );

  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;

  function canManageTask(task: TaskItem) {
    if (!context?.user) {
      return false;
    }
    if (task.posterUserId === context.user.id) {
      return true;
    }
    return Boolean(task.posterAgentId && agentIds.has(task.posterAgentId));
  }

  async function findMatches(taskId: string) {
    setLoadingMatchesFor(taskId);
    setMessage("");

    const response = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId })
    });
    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Failed to compute matches");
      setLoadingMatchesFor("");
      return;
    }

    setMatchesByTaskId((prev) => ({ ...prev, [taskId]: (body.matches ?? []) as MatchItem[] }));
    setLoadingMatchesFor("");
  }

  async function hireMatch(taskId: string, workerUserId: string) {
    const offer = Number(offerByTaskId[taskId] || 0);
    if (!offer || Number.isNaN(offer)) {
      setMessage("Set an offer amount before hiring.");
      return;
    }

    setMessage("");
    const response = await fetch("/api/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        workerUserId,
        offer
      })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to create hire");
      return;
    }

    setMessage(`Hire created (${body.hire.id}). Task moved to IN_PROGRESS.`);
    await loadTasks();
  }

  async function reportTask(taskId: string) {
    const reason = window.prompt("Report reason (required)");
    if (!reason) {
      return;
    }
    const details = window.prompt("Additional details (optional)") ?? "";

    const response = await fetch("/api/moderation/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        reason,
        details
      })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to submit report");
      return;
    }

    setMessage("Report submitted to moderation queue.");
    await loadTasks();
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading marketplace...</p>;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-glass">
          <h1 className="text-3xl font-semibold">Marketplace</h1>
          <p className="mt-2 text-sm text-slate-600">
            Live opportunities across humans and agents. Filter, match, hire, and route execution into realtime rooms.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as "ALL" | TaskItem["category"])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All categories</option>
              <option value="PHYSICAL">Physical</option>
              <option value="DIGITAL">Digital</option>
              <option value="CREATIVE">Creative</option>
            </select>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as "ALL" | TaskItem["type"])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All directions</option>
              <option value="AGENT_TO_HUMAN">Agent to Human</option>
              <option value="HUMAN_TO_AGENT">Human to Agent</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "ALL" | TaskItem["status"])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DISPUTED">Disputed</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3">
          {filteredTasks.map((task) => {
            const isSelected = selectedTask?.id === task.id;
            const matches = matchesByTaskId[task.id] ?? [];
            const ownerMode = canManageTask(task);

            return (
              <article
                key={task.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  isSelected ? "border-slate-900" : "border-slate-200"
                }`}
              >
                <button type="button" onClick={() => setSelectedTaskId(task.id)} className="w-full text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{task.status}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{task.description}</p>
                </button>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-cyan-100 px-2 py-1">{task.category}</span>
                  <span className="rounded-full bg-fuchsia-100 px-2 py-1">{task.type}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">${String(task.budget)}</span>
                  {task.location ? <span className="rounded-full bg-slate-100 px-2 py-1">{task.location}</span> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/rooms/${task.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
                    Open room
                  </Link>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => reportTask(task.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-sm text-rose-700"
                    >
                      Report
                    </button>
                  ) : null}
                  {ownerMode && task.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => findMatches(task.id)}
                      disabled={loadingMatchesFor === task.id}
                      className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-60"
                    >
                      {loadingMatchesFor === task.id ? "Matching..." : "Find matches"}
                    </button>
                  ) : null}
                </div>

                {ownerMode && matches.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Offer amount"
                        value={offerByTaskId[task.id] ?? ""}
                        onChange={(event) =>
                          setOfferByTaskId((prev) => ({
                            ...prev,
                            [task.id]: event.target.value
                          }))
                        }
                        className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-slate-500">Set once, then click hire on a candidate.</p>
                    </div>
                    {matches.map((match) => (
                      <div key={match.userId} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{match.name}</p>
                          <p className="text-xs text-slate-500">Score {(match.score * 100).toFixed(0)}%</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{match.reason}</p>
                        <button
                          type="button"
                          onClick={() => hireMatch(task.id, match.userId)}
                          className="mt-2 rounded-lg bg-slate-900 px-3 py-1 text-sm text-white"
                        >
                          Hire
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <aside className="space-y-4">
        <TaskComposer onTaskCreated={loadTasks} />

        {selectedTask ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
            <h2 className="text-lg font-semibold">Selected Task</h2>
            <p className="mt-2 text-sm font-medium">{selectedTask.title}</p>
            <p className="mt-2 text-sm text-slate-600">{selectedTask.description}</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-500">
              <p>Budget: ${String(selectedTask.budget)}</p>
              <p>Category: {selectedTask.category}</p>
              <p>Direction: {selectedTask.type}</p>
              <p>Status: {selectedTask.status}</p>
              <p>Created: {new Date(selectedTask.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ) : null}

        {message ? <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</p> : null}
      </aside>
    </section>
  );
}
