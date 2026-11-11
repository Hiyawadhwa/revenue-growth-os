"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RuleStatus, ValidationReport } from "@/lib/validation";

const STATUS_STYLE: Record<RuleStatus, string> = {
  passed: "bg-signal-up/10 text-signal-up",
  failed: "bg-signal-down/10 text-signal-down",
  warning: "bg-signal-warn/10 text-signal-warn",
  skipped: "bg-base-800 text-ink-lo",
};

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-base-850 p-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-lo">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${tone ?? "text-ink-hi"}`}>{value}</p>
    </div>
  );
}

export default function DataQualityView({ report }: { report: ValidationReport }) {
  const n = (x: number) => x.toLocaleString("en-IN");
  const tone = report.qualityPct >= 95 ? "text-signal-up" : report.qualityPct >= 80 ? "text-signal-warn" : "text-signal-down";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Records processed" value={n(report.totalRecords)} />
        <Kpi label="Valid records" value={n(report.validRecords)} />
        <Kpi label="Invalid records" value={n(report.invalidRecords)} tone={report.invalidRecords ? "text-signal-down" : undefined} />
        <Kpi label="Duplicate records" value={n(report.duplicateRecords)} />
        <Kpi label="Data quality" value={`${report.qualityPct}%`} tone={tone} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-5">
          <p className="step-num">FAILURES BY CATEGORY</p>
          {report.failuresByCategory.length === 0 ? (
            <p className="mt-6 text-sm text-ink-mid">No validation failures.</p>
          ) : (
            <div className="mt-3 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.failuresByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232636" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: "#a4a6bd", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#63667f", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "#171a25", border: "1px solid #232636", borderRadius: 8, color: "#f3f2fa", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#7c6cf6" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card overflow-x-auto p-5">
          <p className="step-num">VALIDATION RULES</p>
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-lo">
                <th className="pb-2 pr-3">Rule</th>
                <th className="pb-2 pr-3">Result</th>
                <th className="pb-2 text-right">Records</th>
              </tr>
            </thead>
            <tbody>
              {report.rules.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-3 text-ink-hi">
                    {r.name}
                    {r.note && <span className="block text-[11px] text-ink-lo">{r.note}</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="py-2 text-right font-mono text-ink-mid">{r.affected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
