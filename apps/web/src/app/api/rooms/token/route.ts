import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET ?? "dev-room-secret";
  const token = jwt.sign({ roomId, scope: "room:join" }, secret, {
    expiresIn: "1h"
  });

  return NextResponse.json({
    roomId,
    realtimeUrl: process.env.REALTIME_SERVER_URL ?? "http://localhost:4000",
    token
  });
}
