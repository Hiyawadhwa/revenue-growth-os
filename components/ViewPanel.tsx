"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ChevronDown, FlaskConical } from "lucide-react";
import { ViewResult } from "@/lib/analysis";
import ViewChart from "./ViewChart";
import { VIEW_META } from "@/lib/types";

export default function ViewPanel({ view }: { view: ViewResult }) {
  const [showDetail, setShowDetail] = useState(false);
  const meta = VIEW_META[view.id];
  const keyInsight = view.insights[0];
  const recommendedAction = view.insights[view.insights.length - 1];

  return (
    <div className="space-y-8">
      {/* What am I looking at? */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-hi sm:text-[28px]">{meta.label}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-mid">{meta.description}</p>
      </div>

      {/* Key KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {view.kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-line/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-ink-lo">{k.label}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <p className="font-display text-lg font-semibold text-ink-hi">{k.value}</p>
              {k.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-signal-up" />}
              {k.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-signal-down" />}
            </div>
          </div>
        ))}
      </div>

      {/* The chart */}
      <div className="rounded-lg border border-line/70 p-4 sm:p-5">
        <ViewChart type={view.chartType} data={view.chart} title="Performance breakdown" />
      </div>

      {/* Supporting detail — collapsed by default to keep one focus */}
      <div>
        <button
          onClick={() => setShowDetail((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-mid hover:text-ink-hi"
        >
          {showDetail ? "Hide" : "View"} detailed breakdown
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetail ? "rotate-180" : ""}`} />
        </button>
        {showDetail && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line/70 p-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-ink-lo">
                  {view.table.columns.map((c) => (
                    <th key={c} className="pb-2 font-medium uppercase tracking-wide">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {view.table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-line/70">
                    {row.map((cell, j) => (
                      <td key={j} className="py-2 pr-4 text-ink-hi">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* What does this mean? */}
      <div className="border-t border-line/70 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-lo">What this means</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-hi">{keyInsight}</p>
      </div>

      {/* What should I do next? — the one primary action for this page */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent-dim/40 bg-accent-dim/10 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-soft">Recommended action</p>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-hi">{recommendedAction}</p>
        </div>
        <Link
          href="/decision-lab"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft hover:text-base-950"
        >
          <FlaskConical className="h-4 w-4" />
          Test in Decision Lab
        </Link>
      </div>
    </div>
  );
}
