import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type FlexibleDatabase = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: Array<unknown>;
      }
    >;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};

let cachedClient: SupabaseClient<FlexibleDatabase> | null = null;

export function getSupabaseAdminClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cachedClient = createClient<FlexibleDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedClient;
}

export function createEntityId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
