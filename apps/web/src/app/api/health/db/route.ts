import { NextResponse } from "next/server";
import { getResolvedDatabaseSource, getResolvedDatabaseUrl, prisma } from "@/lib/prisma";

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
  const resolvedDatabaseUrl = getResolvedDatabaseUrl();
  const source = getResolvedDatabaseSource();
  const { host, port } = parseDatabaseHostAndPort(resolvedDatabaseUrl);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected", host, port, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        host,
        port,
        source,
        error: message
      },
      { status: 500 }
    );
  }
}
