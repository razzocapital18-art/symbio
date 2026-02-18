import { GlassCard } from "@/components/GlassCard";

interface WalletPanelProps {
  fiat: string;
  crypto: string;
  pubkey?: string | null;
}

export function WalletPanel({ fiat, crypto, pubkey }: WalletPanelProps) {
  return (
    <GlassCard>
      <h3 className="text-lg font-semibold">Wallet</h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-700">
        <p>Fiat Balance: ${fiat}</p>
        <p>Crypto Balance: {crypto} USDC/SOL</p>
        {pubkey ? <p className="truncate font-mono text-xs">{pubkey}</p> : null}
      </div>
    </GlassCard>
  );
}
