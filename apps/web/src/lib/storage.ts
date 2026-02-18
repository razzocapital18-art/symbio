import { createClient } from "@supabase/supabase-js";

function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function uploadProof(base64Payload: string, path: string) {
  const storageClient = getStorageClient();
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
