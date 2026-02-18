import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  hireId: z.string(),
  approved: z.boolean(),
  reviewerNotes: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());

    const hireResult = await supabase
      .from("Hire")
      .update({
        status: payload.approved ? "COMPLETED" : "DISPUTED",
        reviewComment: payload.reviewerNotes ?? null,
        reviewRating: payload.approved ? 5 : 1
      } as never)
      .eq("id", payload.hireId);

    if (hireResult.error) {
      return NextResponse.json({ error: hireResult.error?.message ?? "Failed to verify hire" }, { status: 400 });
    }

    const hireLookup = await supabase
      .from("Hire")
      .select("id,taskId,status,reviewComment,reviewRating,updatedAt")
      .eq("id", payload.hireId)
      .maybeSingle();

    if (hireLookup.error || !hireLookup.data) {
      return NextResponse.json({ error: hireLookup.error?.message ?? "Failed to load updated hire" }, { status: 400 });
    }

    const hire = hireLookup.data as {
      id: string;
      taskId: string;
      status: string;
      reviewComment: string | null;
      reviewRating: number | null;
      updatedAt: string;
    };

    const taskUpdate = await supabase
      .from("Task")
      .update({ status: payload.approved ? "COMPLETED" : "DISPUTED" } as never)
      .eq("id", hire.taskId);

    if (taskUpdate.error) {
      return NextResponse.json({ error: taskUpdate.error.message }, { status: 400 });
    }

    return NextResponse.json({ hire });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
