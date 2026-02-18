import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDatabaseHostAndPort(connectionString: string | undefined) {
  if (!connectionString) {
    return { host: null, port: null };
  }

  try {
    const parsed = new URL(connectionString);
    return { host: parsed.hostname || null, port: parsed.port || null };
  } catch {
    return { host: null, port: null };
  }
}

export async function GET() {
  const { host, port } = parseDatabaseHostAndPort(process.env.DATABASE_URL);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected", host, port });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        host,
        port,
        error: message
      },
      { status: 500 }
    );
  }
}
