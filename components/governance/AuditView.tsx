"use client";

import type { AuditEntry } from "@/lib/governance-types";

export default function AuditView({ entries, persisted }: { entries: AuditEntry[]; persisted: boolean }) {
  return (
    <section className="card p-5">
      <p className="step-num">AUDIT TRAIL</p>
      <p className="mt-1 text-xs text-ink-mid">
        {persisted ? "Stored in the database." : "No database connected. This log is kept for this browser session only."}
      </p>
      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-ink-mid">No activity yet.</p>
      ) : (
        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-ink-lo">
              <th className="pb-2 pr-3">Timestamp</th>
              <th className="pb-2 pr-3">Activity</th>
              <th className="pb-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="py-2 pr-3 font-mono text-ink-mid">{new Date(e.createdAt).toLocaleString("en-IN")}</td>
                <td className="py-2 pr-3 text-ink-hi">{e.action}</td>
                <td className="py-2 text-ink-mid">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
