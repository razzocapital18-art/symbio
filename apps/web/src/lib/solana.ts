import { Connection, Keypair, PublicKey } from "@solana/web3.js";

export function generateAgentWallet() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKeyBase64: Buffer.from(keypair.secretKey).toString("base64")
  };
}

export async function getSolanaBalance(pubkey: string, rpcUrl: string) {
  const connection = new Connection(rpcUrl, "confirmed");
  const lamports = await connection.getBalance(new PublicKey(pubkey));
  return lamports / 1_000_000_000;
}
