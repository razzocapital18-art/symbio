import { PropsWithChildren } from "react";

export function GlassCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white/65 p-6 shadow-glass backdrop-blur-xl transition hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </div>
  );
}
