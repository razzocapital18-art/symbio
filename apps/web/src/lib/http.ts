import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";

export async function enforceRateLimit(request: NextRequest, bucket: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const result = await applyRateLimit(`${bucket}:${ip}`, 60, 60);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "x-ratelimit-remaining": String(result.remaining),
          "x-ratelimit-reset": String(result.resetAt)
        }
      }
    );
  }

  return null;
}
