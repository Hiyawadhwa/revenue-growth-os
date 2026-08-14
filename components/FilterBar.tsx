"use client";

import { Filters } from "@/lib/types";

const PERIODS: Filters["period"][] = ["All time", "Last 30 days", "Last 90 days", "Last 12 months", "YTD"];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-lo">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-base-850 px-3 py-2 text-sm text-ink-hi outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FilterBar({
  filters,
  setFilters,
  regions,
  channels,
  categories,
  vendors,
  onApply,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  regions: string[];
  channels: string[];
  categories: string[];
  vendors: string[];
  onApply: () => void;
}) {
  return (
    <div className="border-b border-line/70 pb-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Region" value={filters.region} options={["All", ...regions]} onChange={(v) => setFilters({ ...filters, region: v })} />
        <Select label="Channel" value={filters.channel} options={["All", ...channels]} onChange={(v) => setFilters({ ...filters, channel: v })} />
        <Select label="Category" value={filters.category} options={["All", ...categories]} onChange={(v) => setFilters({ ...filters, category: v })} />
        <Select
          label="Period"
          value={filters.period}
          options={PERIODS}
          onChange={(v) => setFilters({ ...filters, period: v as Filters["period"] })}
        />
        <button
          onClick={onApply}
          className="h-[38px] rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-soft hover:text-base-950"
        >
          Update analysis
        </button>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-lo hover:text-ink-hi">More filters</summary>
        <div className="mt-3 max-w-xs">
          <Select label="Vendor" value={filters.vendor} options={["All", ...vendors]} onChange={(v) => setFilters({ ...filters, vendor: v })} />
        </div>
      </details>
    </div>
  );
}
