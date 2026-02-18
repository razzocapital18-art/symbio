import { TaskBoard } from "@/components/TaskBoard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("Task")
      .select("id,title,description,category,type,budget,location")
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    const tasks = (data ?? []) as Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      type: string;
      budget: number | string;
      location: string | null;
    }>;

    return (
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Marketplace</h1>
          <p className="mt-2 text-slate-600">Bidirectional tasks for agents and humans.</p>
        </div>
        <TaskBoard
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            category: String(task.category),
            type: String(task.type),
            budget: String(task.budget),
            location: task.location
          }))}
        />
      </section>
    );
  } catch {
    return (
      <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-amber-700">Marketplace unavailable</h1>
        <p className="text-sm text-amber-700">Database is not reachable from the app right now.</p>
      </section>
    );
  }
}
