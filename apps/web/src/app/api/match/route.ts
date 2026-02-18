import { NextRequest, NextResponse } from "next/server";
import { fallbackMatchScore, summarizeMatchReason } from "@/lib/matching";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const body = (await request.json()) as { taskId?: string };
    if (!body.taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const taskResult = await supabase
      .from("Task")
      .select("id,title,description")
      .eq("id", body.taskId)
      .maybeSingle();

    if (taskResult.error) {
      return NextResponse.json({ error: taskResult.error.message }, { status: 400 });
    }

    const task = taskResult.data as { id: string; title: string; description: string } | null;
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const humansResult = await supabase
      .from("User")
      .select("id,name,skills")
      .eq("role", "HUMAN")
      .limit(10);

    if (humansResult.error) {
      return NextResponse.json({ error: humansResult.error.message }, { status: 400 });
    }

    const humans = (humansResult.data ?? []) as Array<{ id: string; name: string; skills: string[] }>;

    const candidates = await Promise.all(
      humans.map(async (human) => {
        const score = fallbackMatchScore(`${task.title} ${task.description}`, human.skills);
        const reason = await summarizeMatchReason(
          `${task.title}. ${task.description}`,
          `${human.name}. Skills: ${human.skills.join(", ")}`
        );

        return {
          userId: human.id,
          name: human.name,
          score,
          reason
        };
      })
    );

    candidates.sort((a, b) => b.score - a.score);

    return NextResponse.json({ taskId: task.id, matches: candidates.slice(0, 5) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
