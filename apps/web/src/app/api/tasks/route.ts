import { NextRequest, NextResponse } from "next/server";
import { taskSchema } from "@/lib/validators";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/http";
import { createEntityId, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentAppUserFromSession } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const minBudget = Number(searchParams.get("minBudget") || 0);
  const maxBudget = Number(searchParams.get("maxBudget") || Number.MAX_SAFE_INTEGER);
  const query = searchParams.get("q")?.trim();

  let queryBuilder = supabase
    .from("Task")
    .select("id,title,description,budget,category,type,status,location,posterUserId,posterAgentId,createdAt")
    .gte("budget", minBudget)
    .lte("budget", maxBudget)
    .order("createdAt", { ascending: false })
    .limit(100);

  if (category && ["PHYSICAL", "DIGITAL", "CREATIVE"].includes(category)) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (type && ["AGENT_TO_HUMAN", "HUMAN_TO_AGENT"].includes(type)) {
    queryBuilder = queryBuilder.eq("type", type);
  }

  if (query) {
    const safeQuery = query.replace(/,/g, " ");
    queryBuilder = queryBuilder.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "task-create");
  if (limited) {
    return limited;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const current = await getCurrentAppUserFromSession();
    if (!current) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = taskSchema.parse(await request.json());
    let posterUserId: string | null = current.id;
    let posterAgentId: string | null = null;

    if (payload.posterAgentId) {
      const agentLookup = await supabase
        .from("Agent")
        .select("id,ownerId")
        .eq("id", payload.posterAgentId)
        .maybeSingle();

      if (agentLookup.error) {
        return NextResponse.json({ error: agentLookup.error.message }, { status: 400 });
      }

      const agent = agentLookup.data as { id: string; ownerId: string } | null;
      if (!agent || agent.ownerId !== current.id) {
        return NextResponse.json({ error: "Agent identity is not owned by current user" }, { status: 403 });
      }

      posterUserId = null;
      posterAgentId = agent.id;
    }

    if (posterAgentId && payload.type !== "AGENT_TO_HUMAN") {
      return NextResponse.json({ error: "Agent-posted tasks must use AGENT_TO_HUMAN type" }, { status: 400 });
    }
    if (posterUserId && payload.type !== "HUMAN_TO_AGENT") {
      return NextResponse.json({ error: "Human-posted tasks must use HUMAN_TO_AGENT type" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("Task")
      .insert({
        id: createEntityId("task"),
        title: sanitizeText(payload.title),
        description: sanitizeRichText(payload.description),
        budget: payload.budget,
        category: payload.category,
        type: payload.type,
        status: "OPEN",
        location: payload.location ? sanitizeText(payload.location) : null,
        posterUserId,
        posterAgentId
      } as never)
      .select("id,title,description,budget,category,type,status,location,posterUserId,posterAgentId,createdAt")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
