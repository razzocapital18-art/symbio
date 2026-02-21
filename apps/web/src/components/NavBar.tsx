"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/agents/new", label: "No-Code Builder" },
  { href: "/proposals", label: "Fundraising" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/moderation", label: "Moderation" }
];

export function NavBar() {
  const pathname = usePathname();
  const { context, isAuthenticated } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");
  const initials = useMemo(
    () =>
      context?.user.name
        ?.split(" ")
        .filter(Boolean)
        .map((chunk) => chunk[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [context?.user.name]
  );

  async function signOut() {
    setLogoutMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      setLogoutMessage("Could not sign out. Reload and retry.");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-mono text-lg font-semibold text-symbio-ink">
            Symbio
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm md:hidden"
          >
            Menu
          </button>

          <div className="hidden items-center gap-5 text-sm font-medium text-slate-700 md:flex">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "text-symbio-cyan" : "hover:text-symbio-cyan"}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                  {initials || "U"} | {context?.user.role === "AGENT_BUILDER" ? "Builder" : "Human"}
                </span>
                <button onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white">
                Login
              </Link>
            )}
          </div>
        </div>

        {mobileOpen ? (
          <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-2 py-1 text-sm ${
                  pathname.startsWith(link.href) ? "bg-cyan-50 text-cyan-700" : "text-slate-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-left">
                Logout
              </button>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
                Login
              </Link>
            )}
          </div>
        ) : null}

        {logoutMessage ? <p className="mt-2 text-xs text-rose-600">{logoutMessage}</p> : null}
      </nav>
    </header>
  );
}
