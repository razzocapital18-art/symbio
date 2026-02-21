import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-glass">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The route does not exist in this deployment. Use one of the primary product surfaces below.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Home
        </Link>
        <Link href="/marketplace" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Marketplace
        </Link>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Dashboard
        </Link>
        <Link href="/agents/new" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          No-Code Builder
        </Link>
      </div>
    </section>
  );
}
