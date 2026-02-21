import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type CurrentAppUser = {
  id: string;
  authId: string;
  email: string;
  name: string;
  role: "HUMAN" | "AGENT_BUILDER";
  skills: string[];
  location: string | null;
  portfolioUrl: string | null;
  bio: string | null;
  reputation: number;
  createdAt: string;
};

export async function getCurrentAppUserFromSession() {
  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();

  if (authResult.error || !authResult.data.user) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const profileResult = await admin
    .from("User")
    .select("id,authId,email,name,role,skills,location,portfolioUrl,bio,reputation,createdAt")
    .eq("authId", authResult.data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  return profileResult.data as CurrentAppUser;
}
