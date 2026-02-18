import { TaskBoard } from "@/components/TaskBoard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        type: true,
        budget: true,
        location: true
      }
    });

    return (
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Marketplace</h1>
          <p className="mt-2 text-slate-600">Bidirectional tasks for agents and humans.</p>
        </div>
        <TaskBoard
          tasks={tasks.map((task) => ({
            ...task,
            category: task.category,
            type: task.type,
            budget: task.budget.toString()
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
