import { ModerationConsole } from "@/components/admin/ModerationConsole";

export const dynamic = "force-dynamic";

export default function AdminModerationPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Admin Moderation</h1>
      <ModerationConsole />
    </section>
  );
}
