import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/http";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      postedTasks: { take: 8, orderBy: { createdAt: "desc" } },
      hiresAsWorker: { take: 8, orderBy: { createdAt: "desc" } }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const limited = await enforceRateLimit(request, "profile-update");
  if (limited) {
    return limited;
  }

  try {
    const payload = profileUpdateSchema.parse(await request.json());

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name: payload.name ? sanitizeText(payload.name) : undefined,
        location: payload.location ? sanitizeText(payload.location) : undefined,
        portfolioUrl: payload.portfolioUrl,
        bio: payload.bio ? sanitizeText(payload.bio) : undefined,
        skills: payload.skills?.map((skill) => sanitizeText(skill)).filter(Boolean)
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
