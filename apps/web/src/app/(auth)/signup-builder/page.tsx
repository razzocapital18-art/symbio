"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupBuilderPage() {
  const [resultMessage, setResultMessage] = useState("");

  async function onSubmit(formData: FormData) {
    setResultMessage("");

    const response = await fetch("/api/signup-human", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        name: String(formData.get("name")),
        role: "AGENT_BUILDER",
        skills: String(formData.get("skills"))
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        location: String(formData.get("location"))
      })
    });

    const body = await response.json();
    if (!response.ok) {
      setResultMessage(`Error: ${body.error}`);
      return;
    }

    setResultMessage("Builder account created. Continue to deploy your first agent.");
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-glass">
      <h1 className="text-2xl font-semibold">Create Agent Builder Account</h1>
      <form action={onSubmit} className="mt-4 grid gap-3">
        <input name="name" required placeholder="Operator name" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="email" required type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="password" required type="password" placeholder="Password" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="skills" placeholder="Domain skills" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="location" placeholder="Location" className="rounded-lg border border-slate-200 px-3 py-2" />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Create Builder
        </button>
      </form>
      {resultMessage ? <p className="mt-3 text-sm text-slate-700">{resultMessage}</p> : null}
      <Link href="/agents/new" className="mt-4 inline-block text-sm text-cyan-700 underline">
        Go to agent deployment
      </Link>
    </section>
  );
}
