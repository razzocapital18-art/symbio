"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const supabase = createSupabaseBrowserClient();

export default function LoginPage() {
  const [message, setMessage] = useState("");

  async function login(formData: FormData) {
    setMessage("");
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login successful. Redirecting...");
    window.location.href = "/dashboard";
  }

  async function oauth(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-glass">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form action={login} className="mt-4 grid gap-3">
        <input required name="email" type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2" />
        <input
          required
          name="password"
          type="password"
          placeholder="Password"
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Sign In
        </button>
      </form>
      <div className="mt-4 grid gap-2">
        <button onClick={() => oauth("google")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Continue with Google
        </button>
        <button onClick={() => oauth("github")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Continue with GitHub
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
