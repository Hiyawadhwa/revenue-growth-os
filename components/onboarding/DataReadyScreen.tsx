"use client";

import { CheckCircle2 } from "lucide-react";
import { MasterRow } from "@/lib/types";

const NEXT_STEPS = [
  "Review performance",
  "Explore products, customers, pricing and marketing",
  "Identify growth opportunities",
  "Test business decisions",
];

function formatDateRange(rows: MasterRow[]) {
  if (!rows.length) return "\u2014";
  const times = rows.map((r) => new Date(r.Date).getTime()).filter((t) => !isNaN(t));
  if (!times.length) return "\u2014";
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${fmt(min)} \u2013 ${fmt(max)}`;
}

export default function DataReadyScreen({
  rows,
  onContinue,
  onStartOver,
}: {
  rows: MasterRow[];
  onContinue: () => void;
  onStartOver: () => void;
}) {
  const products = new Set(rows.map((r) => r.Product)).size;
  const categories = new Set(rows.map((r) => r.Category)).size;
  const regions = new Set(rows.map((r) => r.Region)).size;

  const stats: { label: string; value: string }[] = [
    { label: "Transactions", value: rows.length.toLocaleString() },
    { label: "Products", value: String(products) },
    { label: "Categories", value: String(categories) },
    { label: "Regions", value: String(regions) },
    { label: "Date range", value: formatDateRange(rows) },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center gap-2 text-signal-up">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-display text-xl font-semibold text-ink-hi">Data Ready</span>
      </div>

      <h2 className="mt-6 font-display text-sm font-semibold text-ink-hi">Your dataset is ready</h2>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-mid">
        Here's a quick summary of the data we'll use for your analysis.
      </p>

      <div className="mt-7 grid w-full max-w-lg grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-line/70 px-6 py-5 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-mono text-lg font-semibold text-ink-hi">{s.value}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-lo">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 w-full max-w-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">What happens next</p>
        <div className="mt-3 flex flex-col gap-2.5 text-left sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
          {NEXT_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-base-800 text-[9px] font-semibold text-ink-lo">
                {i + 1}
              </span>
              <span className="text-xs text-ink-mid">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="mt-10 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-soft hover:text-base-950"
      >
        Continue to Analysis →
      </button>
      <button onClick={onStartOver} className="mt-3 text-xs text-ink-lo hover:text-ink-mid">
        Upload a different file
      </button>
    </div>
  );
}
