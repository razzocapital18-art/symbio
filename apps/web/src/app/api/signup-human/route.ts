import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validators";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "signup");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = signupSchema.parse(await request.json());

    const email = sanitizeText(payload.email.toLowerCase());
    const name = sanitizeText(payload.name);
    const skills = payload.skills.map((skill) => sanitizeText(skill)).filter(Boolean);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: false,
      user_metadata: {
        role: payload.role,
        name
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = createEntityId("user");
    const walletId = createEntityId("wallet");

    const userInsert = await supabase
      .from("User")
      .insert({
        id: userId,
        authId: authData.user.id,
        email,
        name,
        role: payload.role,
        skills,
        location: payload.location ? sanitizeText(payload.location) : null,
        portfolioUrl: payload.portfolioUrl,
        bio: payload.bio ? sanitizeText(payload.bio) : null,
        reputation: 0.5
      } as never);

    if (userInsert.error) {
      return NextResponse.json({ error: userInsert.error?.message ?? "Failed to create profile" }, { status: 400 });
    }

    const walletInsert = await supabase
      .from("Wallet")
      .insert({
        id: walletId,
        userId,
        fiatBalance: 0,
        cryptoBalance: 0
      } as never);

    if (walletInsert.error) {
      return NextResponse.json({ error: walletInsert.error?.message ?? "Failed to create wallet" }, { status: 400 });
    }

    const [userLookup, walletLookup] = await Promise.all([
      supabase
        .from("User")
        .select("id,authId,email,name,role,skills,location,portfolioUrl,bio,reputation,createdAt")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("Wallet").select("id,userId,fiatBalance,cryptoBalance").eq("id", walletId).maybeSingle()
    ]);

    if (userLookup.error || walletLookup.error || !userLookup.data || !walletLookup.data) {
      return NextResponse.json(
        {
          error: userLookup.error?.message ?? walletLookup.error?.message ?? "Failed to load created account"
        },
        { status: 400 }
      );
    }

    const user = {
      ...(userLookup.data as Record<string, unknown>),
      wallet: walletLookup.data
    };

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
