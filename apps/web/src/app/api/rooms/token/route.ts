import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getCurrentAppUserFromSession } from "@/lib/current-user";
import { enforceRateLimit } from "@/lib/http";

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "room-token");
  if (limited) {
    return limited;
  }

  const current = await getCurrentAppUserFromSession();
  if (!current) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET ?? "dev-room-secret";
  const token = jwt.sign({ roomId, scope: "room:join", userId: current.id, role: current.role }, secret, {
    expiresIn: "1h"
  });

  return NextResponse.json({
    roomId,
    realtimeUrl: process.env.REALTIME_SERVER_URL ?? "http://localhost:4000",
    token
  });
}
