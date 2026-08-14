"use client";

import { useRef } from "react";
import { UploadCloud, TrendingUp, Package, Target } from "lucide-react";

const EXPLORE_ITEMS = [
  {
    icon: TrendingUp,
    title: "Revenue Performance",
    description: "Understand revenue trends and regional/channel performance.",
  },
  {
    icon: Package,
    title: "Product Performance",
    description: "Identify top products, slow movers, and category trends.",
  },
  {
    icon: Target,
    title: "Growth Opportunities",
    description: "Find pricing, product, customer, and market opportunities.",
  },
];

export default function LandingScreen({
  onUploadFile,
  onUseSample,
  onRawExportFile,
  rawStatus,
}: {
  onUploadFile: (file: File) => void;
  onUseSample: () => void;
  onRawExportFile: (file: File) => void;
  rawStatus: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
        }}
      />
      <input
        ref={rawFileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onRawExportFile(f);
        }}
      />

      <h1 className="font-display text-2xl font-semibold text-ink-hi sm:text-3xl">Revenue Growth Model</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-mid">
        Upload your sales data to see revenue, product, and growth performance \u2014 or explore the platform with sample
        data first.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-soft hover:text-base-950"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Data
        </button>
        <button onClick={onUseSample} className="text-sm text-ink-mid underline-offset-4 hover:text-ink-hi hover:underline">
          Use Sample Data
        </button>
      </div>

      <div className="mt-16 w-full max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">What you can explore</p>
        <div className="mt-4 grid gap-x-8 gap-y-5 text-left sm:grid-cols-3">
          {EXPLORE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-2.5">
              <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-soft" />
              <div>
                <p className="text-xs font-medium text-ink-mid">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-lo">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 border-t border-line/70 pt-6">
        <p className="text-xs text-ink-lo">Have a raw Sales / SAP / POS export?</p>
        <button
          onClick={() => rawFileRef.current?.click()}
          className="mt-1.5 text-xs font-medium text-accent-soft hover:text-ink-hi"
        >
          Format your data →
        </button>
      </div>
      {rawStatus && <p className="mt-2 text-xs text-accent-soft">{rawStatus}</p>}
    </div>
  );
}
