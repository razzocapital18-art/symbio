import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const supabase = getSupabaseAdminClient();

  let builder = supabase
    .from("Agent")
    .select("id,ownerId,name,description,goals,walletPubkey,reputation,totalRevenue,createdAt")
    .order("reputation", { ascending: false })
    .limit(30);

  if (query) {
    const safe = query.replace(/,/g, " ");
    builder = builder.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  const { data, error } = await builder;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const agents = (data ?? []) as Array<{
    id: string;
    name: string;
    description: string;
    goals: string[];
    ownerId: string;
    walletPubkey: string;
    reputation: number;
    totalRevenue: number | string;
    createdAt: string;
  }>;
  if (!query) {
    return NextResponse.json({ agents });
  }

  const queryLower = query.toLowerCase();
  const filtered = agents.filter((agent) => {
    const textMatch =
      agent.name.toLowerCase().includes(queryLower) || agent.description.toLowerCase().includes(queryLower);
    const goalsMatch = (agent.goals ?? []).some((goal) => String(goal).toLowerCase().includes(queryLower));
    return textMatch || goalsMatch;
  });

  return NextResponse.json({ agents: filtered });
}
