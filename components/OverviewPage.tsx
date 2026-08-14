"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ViewResult } from "@/lib/analysis";
import { Filters, MasterRow, ViewId } from "@/lib/types";
import { generateRecommendations } from "@/lib/recommendations";
import ViewChart from "./ViewChart";
import AIRecommendations from "./AIRecommendations";

export default function OverviewPage({
  analysis,
  rows,
  filters,
}: {
  analysis: Record<ViewId, ViewResult>;
  rows: MasterRow[];
  filters: Filters;
}) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const revenue = analysis.revenue;
  const headlineKpis = [revenue.kpis[0], revenue.kpis[1], analysis.customer.kpis[0], analysis.marketing.kpis[0]];
  const keyInsight = revenue.insights[0];
  const topRecommendation = useMemo(() => generateRecommendations(rows, filters)[0], [rows, filters]);

  return (
    <div className="space-y-8">
      {/* What am I looking at? */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-hi sm:text-[28px]">Overview</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-mid">
          A snapshot of overall performance and where to focus next.
        </p>
      </div>

      {/* Key KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {headlineKpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-line/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-ink-lo">{k.label}</p>
            <p className="mt-1.5 font-display text-lg font-semibold text-ink-hi">{k.value}</p>
          </div>
        ))}
      </div>

      {/* The chart */}
      <div className="rounded-lg border border-line/70 p-4 sm:p-5">
        <ViewChart type={revenue.chartType} data={revenue.chart} title="Revenue by region" />
      </div>

      {/* What does this mean? */}
      <div className="border-t border-line/70 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-lo">What this means</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-hi">{keyInsight}</p>
      </div>

      {/* What should I do next? — one primary action, with the full recommendation set tucked behind it */}
      <div className="rounded-xl border border-accent-dim/40 bg-accent-dim/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-soft">Recommended action</p>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-hi">
              {topRecommendation ? topRecommendation.title : "Generate an analysis to see recommended actions."}
            </p>
          </div>
          {topRecommendation && (
            <button
              onClick={() => setShowRecommendations((s) => !s)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft hover:text-base-950"
            >
              {showRecommendations ? "Hide recommended actions" : "View recommended actions"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showRecommendations ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {showRecommendations && <AIRecommendations rows={rows} filters={filters} />}
    </div>
  );
}
