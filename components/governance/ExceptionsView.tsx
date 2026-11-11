"use client";

import { useMemo, useState } from "react";
import { excId, type ExceptionRow, type ExceptionStatus } from "@/lib/governance-types";

const SEV_STYLE = { High: "text-signal-down", Medium: "text-signal-warn", Low: "text-ink-mid" } as const;
const PAGE = 50;

export default function ExceptionsView({
  exceptions,
  onUpdate,
}: {
  exceptions: ExceptionRow[];
  onUpdate: (id: number, status: ExceptionStatus, notes: string) => void;
}) {
  const [status, setStatus] = useState<"All" | ExceptionStatus>("All");
  const [severity, setSeverity] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [page, setPage] = useState(0);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const filtered = useMemo(
    () => exceptions.filter((e) => (status === "All" || e.status === status) && (severity === "All" || e.severity === severity)),
    [exceptions, status, severity]
  );
  const open = exceptions.filter((e) => e.status !== "Resolved").length;
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const select = "rounded-lg border border-line bg-base-850 px-2 py-1.5 text-xs text-ink-hi outline-none focus:border-accent";

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-mid">
          <b className="text-ink-hi">{open}</b> open of {exceptions.length} exceptions
        </p>
        <div className="flex gap-2">
          <select className={select} value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(0); }}>
            {["All", "Open", "Under Review", "Resolved"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={select} value={severity} onChange={(e) => { setSeverity(e.target.value as any); setPage(0); }}>
            {["All", "High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {exceptions.length === 0 ? (
        <p className="mt-6 text-sm text-ink-mid">No exceptions. Upload a file in the Data Quality tab.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-lo">
                {["ID", "Rule violated", "Record", "Severity", "Detected", "Status", "Resolution notes"].map((h) => <th key={h} className="pb-2 pr-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="py-2 pr-3 font-mono text-ink-mid">{excId(e.id)}</td>
                  <td className="py-2 pr-3 text-ink-hi">{e.ruleName}<span className="block text-[11px] text-ink-lo">{e.message}</span></td>
                  <td className="py-2 pr-3 text-ink-mid">{e.record}<span className="block text-[11px] text-ink-lo">Row {e.rowNumber}</span></td>
                  <td className={`py-2 pr-3 font-medium ${SEV_STYLE[e.severity]}`}>{e.severity}</td>
                  <td className="py-2 pr-3 text-ink-mid">{new Date(e.detectedAt).toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-3">
                    <select className={select} value={e.status} onChange={(ev) => onUpdate(e.id, ev.target.value as ExceptionStatus, notes[e.id] ?? e.notes)}>
                      {["Open", "Under Review", "Resolved"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      value={notes[e.id] ?? e.notes}
                      onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))}
                      onBlur={() => (notes[e.id] ?? e.notes) !== e.notes && onUpdate(e.id, e.status, notes[e.id])}
                      placeholder="Add a note"
                      className="w-44 rounded-lg border border-line bg-base-850 px-2 py-1.5 text-xs text-ink-hi outline-none focus:border-accent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > PAGE && (
        <div className="mt-4 flex items-center justify-end gap-3 text-xs text-ink-mid">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-line px-3 py-1 disabled:opacity-40">Prev</button>
          <span>{page * PAGE + 1}-{Math.min((page + 1) * PAGE, filtered.length)} of {filtered.length}</span>
          <button disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(page + 1)} className="rounded-md border border-line px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </section>
  );
}
