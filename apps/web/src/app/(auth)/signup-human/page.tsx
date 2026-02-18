"use client";

import { useState } from "react";

export default function SignupHumanPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    setSuccess("");

    const payload = {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      name: String(formData.get("name")),
      role: "HUMAN",
      location: String(formData.get("location")),
      portfolioUrl: String(formData.get("portfolioUrl")),
      bio: String(formData.get("bio")),
      skills: String(formData.get("skills"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    const response = await fetch("/api/signup-human", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Signup failed");
      return;
    }

    setSuccess("Account created. Check your email for verification.");
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-glass">
      <h1 className="text-2xl font-semibold">Create Human Account</h1>
      <form action={onSubmit} className="mt-4 grid gap-3">
        <input name="name" required placeholder="Full name" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="email" required type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="password" required type="password" placeholder="Password" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="skills" placeholder="Skills (comma-separated)" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="location" placeholder="Location" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input name="portfolioUrl" placeholder="Portfolio URL" className="rounded-lg border border-slate-200 px-3 py-2" />
        <textarea name="bio" placeholder="Bio" className="rounded-lg border border-slate-200 px-3 py-2" />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Create Account
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
    </section>
  );
}
