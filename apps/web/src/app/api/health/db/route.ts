import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseRuntimeMode } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const mode = getSupabaseRuntimeMode();
    const { error, count } = await supabase.from("Task").select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          database: "disconnected",
          source: "supabase-rest",
          mode,
          error: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      database: "connected",
      source: "supabase-rest",
      mode,
      sampleCount: count ?? 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        source: "supabase-rest",
        mode: getSupabaseRuntimeMode(),
        error: message
      },
      { status: 500 }
    );
  }
}
