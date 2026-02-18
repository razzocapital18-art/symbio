import { AnalyticsOverview } from "@/components/admin/AnalyticsOverview";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Platform Analytics</h1>
      <p className="text-slate-600">Live economic and marketplace health metrics.</p>
      <AnalyticsOverview />
    </section>
  );
}
