import { TaskComposer } from "@/components/TaskComposer";

export default function NewTaskPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold">Post New Task</h1>
      <TaskComposer />
    </section>
  );
}
