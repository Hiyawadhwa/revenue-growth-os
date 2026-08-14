"use client";

import { Download, Loader2 } from "lucide-react";
import { ViewResult } from "@/lib/analysis";
import { ViewId } from "@/lib/types";

export default function ExecutiveReportPage({
  analysis,
  exportBusy,
  filterSummary,
  onExportMaster,
  onExportJson,
  onExportPptx,
}: {
  analysis: Record<ViewId, ViewResult> | null;
  exportBusy: boolean;
  filterSummary: string;
  onExportMaster: () => void;
  onExportJson: () => void;
  onExportPptx: () => void;
}) {
  return (
    <div className="space-y-8">
      {/* What am I looking at? */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-hi sm:text-[28px]">Executive Report</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-mid">
          Export a stakeholder-ready summary of your current analysis.
        </p>
      </div>

      {/* Key KPIs — what will be included */}
      {analysis && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {analysis.revenue.kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-line/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-lo">{k.label}</p>
              <p className="mt-1.5 font-display text-lg font-semibold text-ink-hi">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* What does this mean? */}
      <div className="border-t border-line/70 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-lo">What this means</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-hi">
          The deck bundles your current KPIs, charts, and recommended actions into a format you can share with
          stakeholders. Scope: {filterSummary}.
        </p>
      </div>

      {/* What should I do next? — one clear primary action, exports as secondary options */}
      <div className="rounded-xl border border-accent-dim/40 bg-accent-dim/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-soft">Recommended action</p>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-hi">
              Export the executive deck to share headline performance and recommended actions with stakeholders.
            </p>
          </div>
          <button
            onClick={onExportPptx}
            disabled={!analysis || exportBusy}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft hover:text-base-950 disabled:opacity-40"
          >
            {exportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportBusy ? "Preparing deck…" : "Export PPTX Deck"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={onExportJson}
          disabled={!analysis}
          className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-medium text-ink-mid hover:border-accent-dim hover:text-ink-hi disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Insights (.json)
        </button>
        <button
          onClick={onExportMaster}
          className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-medium text-ink-mid hover:border-accent-dim hover:text-ink-hi"
        >
          <Download className="h-3.5 w-3.5" />
          Clean Master DB (.xlsx)
        </button>
      </div>
    </div>
  );
}
