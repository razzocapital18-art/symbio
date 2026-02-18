import { createClient } from "@supabase/supabase-js";

const storageClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function uploadProof(base64Payload: string, path: string) {
  const buffer = Buffer.from(base64Payload, "base64");
  const { error } = await storageClient.storage
    .from("proofs")
    .upload(path, buffer, { contentType: "application/octet-stream", upsert: true });

  if (error) {
    throw error;
  }

  const { data } = storageClient.storage.from("proofs").getPublicUrl(path);
  return data.publicUrl;
}
