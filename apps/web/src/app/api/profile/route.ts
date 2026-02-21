import { NextRequest, NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/validators";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/http";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  const current = await getCurrentAppUserFromSession();
  if (!current) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const requestedUserId = request.nextUrl.searchParams.get("userId");
  if (requestedUserId && requestedUserId !== current.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = current.id;

  const [userRes, walletRes, postedTasksRes, hiresRes] = await Promise.all([
    supabase
      .from("User")
      .select("id,authId,email,name,role,skills,location,portfolioUrl,bio,reputation,createdAt")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("Wallet").select("id,userId,fiatBalance,cryptoBalance,stripeConnectId,cryptoPubkey").eq("userId", userId).maybeSingle(),
    supabase.from("Task").select("id,title,status,budget,createdAt").eq("posterUserId", userId).order("createdAt", { ascending: false }).limit(8),
    supabase.from("Hire").select("id,taskId,status,offer,createdAt").eq("workerUserId", userId).order("createdAt", { ascending: false }).limit(8)
  ]);

  const firstError = [userRes.error, walletRes.error, postedTasksRes.error, hiresRes.error].find(Boolean);
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  const user = userRes.data as Record<string, unknown> | null;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      wallet: walletRes.data ?? null,
      postedTasks: postedTasksRes.data ?? [],
      hiresAsWorker: hiresRes.data ?? []
    }
  });
}

export async function PATCH(request: NextRequest) {
  const limited = await enforceRateLimit(request, "profile-update");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = profileUpdateSchema.parse(await request.json());
    if (payload.userId && payload.userId !== current.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetUserId = current.id;

    const updateResult = await supabase
      .from("User")
      .update({
        name: payload.name ? sanitizeText(payload.name) : undefined,
        location: payload.location ? sanitizeText(payload.location) : undefined,
        portfolioUrl: payload.portfolioUrl,
        bio: payload.bio ? sanitizeText(payload.bio) : undefined,
        skills: payload.skills?.map((skill) => sanitizeText(skill)).filter(Boolean)
      } as never)
      .eq("id", targetUserId);

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error?.message ?? "Profile update failed" }, { status: 400 });
    }

    const userLookup = await supabase
      .from("User")
      .select("id,authId,email,name,role,skills,location,portfolioUrl,bio,reputation,createdAt")
      .eq("id", targetUserId)
      .maybeSingle();

    if (userLookup.error || !userLookup.data) {
      return NextResponse.json({ error: userLookup.error?.message ?? "Failed to load updated profile" }, { status: 400 });
    }

    return NextResponse.json({ user: userLookup.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
