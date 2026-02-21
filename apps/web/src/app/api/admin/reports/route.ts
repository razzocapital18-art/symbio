import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/http";
import { reportStatusUpdateSchema } from "@/lib/validators";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

async function assertAdminAccess() {
  const current = await getCurrentAppUserFromSession();
  if (!current) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (current.role !== "AGENT_BUILDER") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const denied = await assertAdminAccess();
  if (denied) {
    return denied;
  }

  const supabase = getSupabaseAdminClient();
  const reportsResult = await supabase
    .from("Report")
    .select("id,taskId,reporterId,reason,details,status,createdAt")
    .order("createdAt", { ascending: false })
    .limit(100);

  if (reportsResult.error) {
    return NextResponse.json({ error: reportsResult.error.message }, { status: 500 });
  }

  const reports = (reportsResult.data ?? []) as Array<{
    id: string;
    taskId: string;
    reporterId: string;
    reason: string;
    details: string | null;
    status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
    createdAt: string;
  }>;

  const taskIds = Array.from(new Set(reports.map((report) => report.taskId).filter(Boolean)));
  const reporterIds = Array.from(new Set(reports.map((report) => report.reporterId).filter(Boolean)));

  const [tasksResult, reportersResult] = await Promise.all([
    taskIds.length
      ? supabase.from("Task").select("id,title,status").in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    reporterIds.length
      ? supabase.from("User").select("id,name,email").in("id", reporterIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (tasksResult.error || reportersResult.error) {
    return NextResponse.json({ error: tasksResult.error?.message ?? reportersResult.error?.message }, { status: 500 });
  }

  const tasksById = new Map(((tasksResult.data ?? []) as Array<{ id: string; title: string; status: string }>).map((task) => [task.id, task]));
  const reportersById = new Map(
    ((reportersResult.data ?? []) as Array<{ id: string; name: string; email: string }>).map((reporter) => [reporter.id, reporter])
  );

  return NextResponse.json({
    reports: reports.map((report) => ({
      ...report,
      task: tasksById.get(report.taskId) ?? { id: report.taskId, title: "Unknown Task", status: "UNKNOWN" },
      reporter: reportersById.get(report.reporterId) ?? { id: report.reporterId, name: "Unknown", email: "unknown@example.com" }
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const denied = await assertAdminAccess();
  if (denied) {
    return denied;
  }

  const limited = await enforceRateLimit(request, "admin-report-update");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = reportStatusUpdateSchema.parse(await request.json());

    const reportUpdate = await supabase
      .from("Report")
      .update({ status: payload.status } as never)
      .eq("id", payload.reportId);

    if (reportUpdate.error) {
      return NextResponse.json({ error: reportUpdate.error?.message ?? "Failed to update report" }, { status: 400 });
    }

    const reportLookup = await supabase
      .from("Report")
      .select("id,taskId,status,updatedAt")
      .eq("id", payload.reportId)
      .maybeSingle();

    if (reportLookup.error || !reportLookup.data) {
      return NextResponse.json({ error: reportLookup.error?.message ?? "Failed to load updated report" }, { status: 400 });
    }

    const updatedReport = reportLookup.data as { id: string; taskId: string; status: string; updatedAt: string };

    if (payload.status === "RESOLVED") {
      const taskUpdate = await supabase.from("Task").update({ status: "OPEN" } as never).eq("id", updatedReport.taskId);
      if (taskUpdate.error) {
        return NextResponse.json({ error: taskUpdate.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
