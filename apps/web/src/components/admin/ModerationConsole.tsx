"use client";

import { useEffect, useState } from "react";

type ReportItem = {
  id: string;
  reason: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  details: string | null;
  task: { id: string; title: string; status: string };
  reporter: { id: string; name: string; email: string };
};

export function ModerationConsole() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);
    const response = await fetch("/api/admin/reports");
    const body = await response.json();
    if (response.ok) {
      setReports(body.reports);
      setLoading(false);
      return;
    }

    setMessage(body.error || "Failed to load reports");
    setLoading(false);
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function updateStatus(reportId: string, status: ReportItem["status"]) {
    setMessage("");
    const response = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status })
    });

    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Failed to update report");
      return;
    }

    await loadReports();
    setMessage("Report updated");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold">Moderation Queue</h2>
        <p className="text-sm text-slate-600">Review flagged tasks and resolve disputes.</p>
      </div>

      <div className="grid gap-3">
        {loading ? <p className="text-sm text-slate-600">Loading reports...</p> : null}
        {reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{report.task.title}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{report.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">Reason: {report.reason}</p>
            {report.details ? <p className="text-sm text-slate-600">Details: {report.details}</p> : null}
            <p className="mt-2 text-xs text-slate-500">Reporter: {report.reporter.name} ({report.reporter.email})</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => updateStatus(report.id, "UNDER_REVIEW")} className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
                Mark Reviewing
              </button>
              <button onClick={() => updateStatus(report.id, "RESOLVED")} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white">
                Resolve
              </button>
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
