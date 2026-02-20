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
let cachedMode: "service_role" | "anon" | null = null;

export function getSupabaseAdminClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    throw new Error(
      "Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cachedMode = serviceRoleKey ? "service_role" : "anon";

  cachedClient = createClient<FlexibleDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedClient;
}

export function getSupabaseRuntimeMode() {
  if (cachedMode) {
    return cachedMode;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "service_role";
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "anon";
  }

  return "unset";
}

export function createEntityId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
