"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  budget: string;
  location: string | null;
};

export function TaskBoard({ tasks }: { tasks: TaskItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        const matchQuery = `${task.title} ${task.description}`.toLowerCase().includes(query.toLowerCase());
        const matchCategory = category === "ALL" || task.category === category;
        return matchQuery && matchCategory;
      }),
    [tasks, query, category]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Search tasks"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title or keyword"
          className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select
          aria-label="Filter tasks by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All categories</option>
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
          <option value="CREATIVE">Creative</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((task) => (
          <GlassCard key={task.id}>
            <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{task.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-cyan-100 px-2 py-1">{task.category}</span>
              <span className="rounded-full bg-fuchsia-100 px-2 py-1">{task.type}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">${task.budget}</span>
              {task.location ? <span className="rounded-full bg-slate-100 px-2 py-1">{task.location}</span> : null}
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
