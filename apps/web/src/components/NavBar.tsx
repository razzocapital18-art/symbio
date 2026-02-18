import Link from "next/link";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/agents/new", label: "No-Code Builder" },
  { href: "/proposals", label: "Fundraising" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/login", label: "Login" }
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-mono text-lg font-semibold text-symbio-ink">
          Symbio
        </Link>
        <div className="flex items-center gap-5 text-sm font-medium text-slate-700">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-symbio-cyan">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
