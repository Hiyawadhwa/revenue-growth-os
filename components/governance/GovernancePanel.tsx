"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FileDrop from "@/components/FileDrop";
import type { ValidationReport } from "@/lib/validation";
import type { ReconResult } from "@/lib/reconcile";
import { excId, type AuditEntry, type ExceptionRow, type ExceptionStatus } from "@/lib/governance-types";
import DataQualityView from "./DataQualityView";
import ExceptionsView from "./ExceptionsView";
import ReconciliationView from "./ReconciliationView";
import AuditView from "./AuditView";
import DocsView from "./DocsView";

const TABS = ["Data quality", "Exceptions", "Reconciliation", "Audit log", "Documentation"] as const;
type Tab = (typeof TABS)[number];

export default function GovernancePanel() {
  const [tab, setTab] = useState<Tab>("Data quality");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localId = useRef(0);

  const refreshAudit = useCallback(async () => {
    const data = await fetch("/api/audit").then((r) => r.json());
    setPersisted(data.enabled);
    if (data.enabled) setAudit(data.entries);
    return data.enabled as boolean;
  }, []);

  useEffect(() => {
    refreshAudit().catch(() => setPersisted(false));
  }, [refreshAudit]);

  // Without a database, keep the audit trail in memory for this session.
  const log = useCallback(
    async (action: string, detail: string) => {
      if (persisted) return refreshAudit();
      setAudit((a) => [{ id: ++localId.current, action, detail, createdAt: new Date().toISOString() }, ...a]);
    },
    [persisted, refreshAudit]
  );

  async function handleValidate(file: File) {
    setFileName(file.name);
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/validate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");
      setReport(data.report);
      setExceptions(data.exceptions);
      setPersisted(data.persisted);
      if (data.persisted) await refreshAudit();
      else {
        const t = new Date().toISOString();
        setAudit((a) => [
          { id: ++localId.current, action: "Validation completed", detail: `${data.exceptions.length} exceptions detected, quality ${data.report.qualityPct}%`, createdAt: t },
          { id: ++localId.current, action: "Dataset uploaded", detail: `${file.name} (${data.report.totalRecords} records)`, createdAt: t },
          ...a,
        ]);
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id: number, status: ExceptionStatus, notes: string) {
    const target = exceptions.find((e) => e.id === id);
    setExceptions((list) => list.map((e) => (e.id === id ? { ...e, status, notes } : e)));
    if (persisted) {
      await fetch("/api/exceptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      await refreshAudit();
    } else if (target && target.status !== status) {
      await log(`Exception marked ${status.toLowerCase()}`, `${excId(id)} (${target.ruleName})`);
    }
  }

  function handleRecon(r: ReconResult, a: string, b: string) {
    if (persisted) void refreshAudit();
    else void log("Reconciliation run", `${a} vs ${b}: ${r.matched} matched, ${r.onlyInA + r.onlyInB} unmatched, ${r.amountMismatches} amount mismatches`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-8">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="step-num">STEP 1</p>
            <h1 className="font-display text-xl font-bold text-ink-hi">Validate a dataset</h1>
            <p className="mt-1 text-xs text-ink-mid">Upload a raw Sales / POS file. It is checked against 13 rules before it reaches the analytics.</p>
            <p className="mt-1 text-[11px] text-ink-lo">{persisted ? "Database connected: results are saved." : "No database connected: results last for this session only."}</p>
          </div>
          <div className="w-full max-w-sm">
            <FileDrop label={busy ? "Validating…" : "Upload raw XLS / XLSX / CSV"} hint="Click or drag & drop" onFile={handleValidate} fileName={fileName} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-signal-down">{error}</p>}
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-line pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === t ? "bg-base-800 text-ink-hi" : "text-ink-lo hover:bg-base-850 hover:text-ink-hi"}`}
          >
            {t}
            {t === "Exceptions" && exceptions.length > 0 && <span className="ml-1.5 text-signal-warn">{exceptions.filter((e) => e.status !== "Resolved").length}</span>}
          </button>
        ))}
      </nav>

      {tab === "Data quality" && (report ? <DataQualityView report={report} /> : <p className="card p-8 text-center text-sm text-ink-mid">Upload a file to see data quality results.</p>)}
      {tab === "Exceptions" && <ExceptionsView exceptions={exceptions} onUpdate={handleUpdate} />}
      {tab === "Reconciliation" && <ReconciliationView onDone={handleRecon} />}
      {tab === "Audit log" && <AuditView entries={audit} persisted={persisted} />}
      {tab === "Documentation" && <DocsView />}
    </div>
  );
}
