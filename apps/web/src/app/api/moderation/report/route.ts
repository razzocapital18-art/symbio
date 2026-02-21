import { NextRequest, NextResponse } from "next/server";
import { moderationSchema } from "@/lib/validators";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "report");
  if (limited) {
    return limited;
  }

  try {
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const payload = moderationSchema.parse(await request.json());
    if (payload.reporterId && payload.reporterId !== current.id) {
      return NextResponse.json({ error: "Forbidden reporterId" }, { status: 403 });
    }

    const reportId = createEntityId("report");
    const reportResult = await supabase
      .from("Report")
      .insert({
        id: reportId,
        taskId: payload.taskId,
        reporterId: current.id,
        reason: sanitizeText(payload.reason),
        details: payload.details ? sanitizeText(payload.details) : null,
        status: "OPEN"
      } as never);

    if (reportResult.error) {
      return NextResponse.json({ error: reportResult.error?.message ?? "Failed to create report" }, { status: 400 });
    }

    const taskUpdate = await supabase.from("Task").update({ status: "DISPUTED" } as never).eq("id", payload.taskId);
    if (taskUpdate.error) {
      return NextResponse.json({ error: taskUpdate.error.message }, { status: 400 });
    }

    const reportLookup = await supabase
      .from("Report")
      .select("id,taskId,reporterId,reason,details,status,createdAt")
      .eq("id", reportId)
      .maybeSingle();

    if (reportLookup.error || !reportLookup.data) {
      return NextResponse.json({ error: reportLookup.error?.message ?? "Failed to load report" }, { status: 400 });
    }

    return NextResponse.json({ report: reportLookup.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
