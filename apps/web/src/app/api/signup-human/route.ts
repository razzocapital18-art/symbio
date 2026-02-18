import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validators";
import { sanitizeText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";

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

    const user = await prisma.user.create({
      data: {
        authId: authData.user.id,
        email,
        name,
        role: payload.role,
        skills,
        location: payload.location ? sanitizeText(payload.location) : null,
        portfolioUrl: payload.portfolioUrl,
        bio: payload.bio ? sanitizeText(payload.bio) : null,
        wallet: {
          create: {
            fiatBalance: 0,
            cryptoBalance: 0
          }
        }
      },
      include: { wallet: true }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
