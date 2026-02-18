export function ReputationBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct > 80 ? "bg-emerald-100 text-emerald-700" : pct > 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>Reputation {pct}</span>;
}
