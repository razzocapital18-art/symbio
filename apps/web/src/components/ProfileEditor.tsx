"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type ProfilePayload = {
  id: string;
  name: string;
  email: string;
  location: string | null;
  portfolioUrl: string | null;
  bio: string | null;
  skills: string[];
  reputation: number;
  wallet?: {
    id: string;
    stripeConnectId: string | null;
  } | null;
};

export function ProfileEditor() {
  const { loading: userLoading, context, isAuthenticated } = useCurrentUser();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  async function loadProfileByCurrentUser() {
    setMessage("");
    const response = await fetch("/api/profile", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to load profile");
      return;
    }
    setProfile(body.user);
  }

  useEffect(() => {
    if (context?.user?.id) {
      void loadProfileByCurrentUser();
    }
  }, [context?.user?.id]);

  async function saveProfile(formData: FormData) {
    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name")),
        location: String(formData.get("location")),
        portfolioUrl: String(formData.get("portfolioUrl")),
        bio: String(formData.get("bio")),
        skills: String(formData.get("skills"))
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      })
    });

    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(body.error || "Failed to update profile");
      return;
    }

    setProfile(body.user);
    setMessage("Profile updated");
  }

  async function connectStripe() {
    if (!profile?.wallet?.id) {
      setMessage("No wallet found for this profile");
      return;
    }

    setConnecting(true);
    setMessage("");

    const response = await fetch("/api/wallet/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletId: profile.wallet.id,
        email: profile.email,
        refreshUrl: window.location.href,
        returnUrl: window.location.href
      })
    });

    const body = await response.json();
    setConnecting(false);
    if (!response.ok) {
      setMessage(body.error || "Stripe connect failed");
      return;
    }

    window.location.href = body.onboardingUrl;
  }

  if (userLoading) {
    return <p className="text-sm text-slate-600">Loading profile...</p>;
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold text-amber-700">Login required</h2>
        <p className="mt-2 text-sm text-amber-700">Sign in to manage your profile and payout settings.</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="mt-1 text-sm text-slate-600">{context?.user.name} ({context?.user.email})</p>
      </div>

      {profile ? (
        <form action={saveProfile} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="text-lg font-semibold">Edit Profile</h3>
          <input name="name" defaultValue={profile.name} className="rounded-lg border border-slate-200 px-3 py-2" />
          <input
            name="location"
            defaultValue={profile.location ?? ""}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <input
            name="portfolioUrl"
            defaultValue={profile.portfolioUrl ?? ""}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <textarea name="bio" defaultValue={profile.bio ?? ""} className="rounded-lg border border-slate-200 px-3 py-2" />
          <input
            name="skills"
            defaultValue={profile.skills.join(", ")}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
          <p className="text-xs text-slate-500">Reputation: {Math.round(profile.reputation * 100)}</p>
          <p className="text-xs text-slate-500">
            Stripe Connect: {profile.wallet?.stripeConnectId ? "Connected" : "Not connected"}
          </p>
          <button disabled={saving} type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-70">
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <button
            type="button"
            onClick={connectStripe}
            disabled={connecting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-70"
          >
            {connecting ? "Connecting..." : "Connect Stripe Payouts"}
          </button>
        </form>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            Profile record not found for this auth account. Create an account via signup to initialize profile + wallet.
          </p>
        </section>
      )}

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
