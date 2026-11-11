"use client";

import { useState } from "react";
import FileDrop from "@/components/FileDrop";
import type { ReconResult } from "@/lib/reconcile";

const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ReconciliationView({ onDone }: { onDone: (r: ReconResult, a: string, b: string) => void }) {
  const [a, setA] = useState<File | null>(null);
  const [b, setB] = useState<File | null>(null);
  const [result, setResult] = useState<ReconResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!a || !b) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("fileA", a);
      fd.append("fileB", b);
      const res = await fetch("/api/reconcile", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reconciliation failed");
      setResult(data.result);
      onDone(data.result, a.name, b.name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string][] = result
    ? [
        ["Source A records", result.recordsA.toLocaleString("en-IN")],
        ["Source B records", result.recordsB.toLocaleString("en-IN")],
        ["Matched records", result.matched.toLocaleString("en-IN")],
        ["Unmatched records", (result.onlyInA + result.onlyInB).toLocaleString("en-IN")],
        ["Amount mismatches", result.amountMismatches.toLocaleString("en-IN")],
        ["Duplicate IDs (A / B)", `${result.duplicatesA} / ${result.duplicatesB}`],
        ["Total A", money(result.totalA)],
        ["Total B", money(result.totalB)],
        ["Total discrepancy (A - B)", money(result.discrepancy)],
      ]
    : [];

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <p className="step-num">COMPARE TWO SOURCES</p>
        <p className="mt-1 text-xs text-ink-mid">Each file needs a transaction/order ID column and an amount column. Records are matched on ID.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FileDrop label="Source A: sales transactions" hint=".xlsx / .xls / .csv" onFile={setA} fileName={a?.name} />
          <FileDrop label="Source B: POS settlement / summary" hint=".xlsx / .xls / .csv" onFile={setB} fileName={b?.name} />
        </div>
        <button onClick={run} disabled={!a || !b || busy} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-soft hover:text-base-950 disabled:opacity-40">
          {busy ? "Reconciling…" : "Run reconciliation"}
        </button>
        {error && <p className="mt-3 text-xs text-signal-down">{error}</p>}
      </section>

      {result && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <section className="card p-5">
            <p className="step-num">SUMMARY</p>
            <table className="mt-3 w-full text-xs">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k} className="border-t border-line first:border-0">
                    <td className="py-2 text-ink-mid">{k}</td>
                    <td className="py-2 text-right font-mono text-ink-hi">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card overflow-x-auto p-5">
            <p className="step-num">LARGEST DIFFERENCES {result.diffs.length === 200 ? "(TOP 200)" : ""}</p>
            <table className="mt-3 w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-ink-lo">
                  {["ID", "Type", "Amount A", "Amount B", "Difference"].map((h) => <th key={h} className="pb-2 pr-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {result.diffs.slice(0, 50).map((d) => (
                  <tr key={d.id + d.type} className="border-t border-line">
                    <td className="py-2 pr-3 font-mono text-ink-hi">{d.id}</td>
                    <td className="py-2 pr-3 text-ink-mid">{d.type}</td>
                    <td className="py-2 pr-3 font-mono text-ink-mid">{d.amountA === null ? "-" : money(d.amountA)}</td>
                    <td className="py-2 pr-3 font-mono text-ink-mid">{d.amountB === null ? "-" : money(d.amountB)}</td>
                    <td className="py-2 font-mono text-signal-warn">{money(d.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
