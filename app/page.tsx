"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, BarChart3, FlaskConical, FileText, ChevronDown } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import ViewPanel from "@/components/ViewPanel";
import OverviewPage from "@/components/OverviewPage";
import ExecutiveReportPage from "@/components/ExecutiveReportPage";
import AICopilot from "@/components/AICopilot";
import ProgressTracker from "@/components/onboarding/ProgressTracker";
import LandingScreen from "@/components/onboarding/LandingScreen";
import DataReadyScreen from "@/components/onboarding/DataReadyScreen";
import { generateSampleData, SAMPLE_META } from "@/lib/sampleData";
import { buildMasterDb, exportMasterWorkbook, parseRawWorkbook } from "@/lib/masterDb";
import { applyFilters, generateAnalysis, ViewResult } from "@/lib/analysis";
import { Filters, MasterRow, ViewId, VIEW_META } from "@/lib/types";

const DEFAULT_FILTERS: Filters = { region: "All", channel: "All", category: "All", vendor: "All", period: "All time" };

type Section = "overview" | ViewId | "report";

// The six existing analysis views this workspace surfaces, mapped to their nav labels.
const NAV_ITEMS: { label: string; section: Section }[] = [
  { label: "Overview", section: "overview" },
  { label: "Revenue", section: "revenue" },
  { label: "Products", section: "sku" },
  { label: "Customers", section: "customer" },
  { label: "Marketing", section: "marketing" },
  { label: "Pricing", section: "pricing" },
  { label: "Opportunities", section: "expansion" },
];

// Existing analysis views not covered by the primary nav mapping — kept reachable, out of the way, under "More".
const MORE_VIEW_IDS: ViewId[] = ["supply", "shelf", "competition"];

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [sampleRaw] = useState(() => generateSampleData());
  const [masterRows, setMasterRows] = useState<MasterRow[]>(() => buildMasterDb(sampleRaw));
  const [usingSample, setUsingSample] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [stage, setStage] = useState<"landing" | "review" | "workspace">("landing");

  const [formattedFileName, setFormattedFileName] = useState<string | null>(null);
  const [formatStatus, setFormatStatus] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [section, setSection] = useState<Section>("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const [analysis, setAnalysis] = useState<Record<ViewId, ViewResult> | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("revenue-growth-os:rows", JSON.stringify(masterRows));
    sessionStorage.setItem("revenue-growth-os:filters", JSON.stringify(filters));
  }, [masterRows, filters]);

  const dims = useMemo(() => {
    const uniq = (f: (r: MasterRow) => string) => [...new Set(masterRows.map(f))].sort();
    return {
      regions: uniq((r) => r.Region),
      channels: uniq((r) => r.Channel),
      categories: uniq((r) => r.Category),
      vendors: uniq((r) => r.Vendor),
    };
  }, [masterRows]);

  async function handleRawUpload(file: File): Promise<boolean> {
    setFormattedFileName(file.name);
    setFormatStatus("Formatting\u2026");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/format", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Format failed");
      const buf = await res.arrayBuffer();
      downloadBlob(buf, "Master_DB.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const { rows } = parseRawWorkbook(buf);
      setMasterRows(buildMasterDb(rows));
      setUsingSample(false);
      setAnalysis(null);
      setBannerVisible(true);
      setFormatStatus(`Formatted ${rows.length.toLocaleString()} rows \u2014 Master DB downloaded.`);
      return true;
    } catch (e: any) {
      setFormatStatus(e.message ?? "Something went wrong formatting that file.");
      return false;
    }
  }

  // --- Onboarding-stage wrappers: same underlying parse/derive calls the old handler used, plus advancing the gate ---
  function handleLandingUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const { rows } = parseRawWorkbook(buf);
      const hasDerived = rows.length && (rows[0] as any).CLV !== undefined;
      setMasterRows(hasDerived ? (rows as unknown as MasterRow[]) : buildMasterDb(rows));
      setUsingSample(false);
      setAnalysis(null);
      setBannerVisible(true);
      setStage("review");
    };
    reader.readAsArrayBuffer(file);
  }
  function handleLandingUseSample() {
    setMasterRows(buildMasterDb(sampleRaw));
    setUsingSample(true);
    setAnalysis(null);
    setBannerVisible(true);
    setStage("review");
  }
  async function handleLandingRawExport(file: File) {
    const ok = await handleRawUpload(file);
    if (ok) setStage("review");
  }

  function handleGenerate() {
    const filtered = applyFilters(masterRows, filters);
    setAnalysis(generateAnalysis(filtered.length ? filtered : masterRows));
  }

  // Analysis appears automatically once the workspace is entered, and refreshes on demand via the filter bar.
  useEffect(() => {
    if (stage === "workspace" && !analysis) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function handleExportMaster() {
    const bytes = exportMasterWorkbook(masterRows);
    downloadBlob(bytes, "Master_DB.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  function handleExportJson() {
    if (!analysis) return;
    downloadBlob(JSON.stringify(analysis, null, 2), "insights.json", "application/json");
  }

  async function handleExportPptx() {
    if (!analysis) return;
    setExportBusy(true);
    try {
      const res = await fetch("/api/export-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const buf = await res.arrayBuffer();
      downloadBlob(buf, "Revenue_Growth_OS_Deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    } finally {
      setExportBusy(false);
    }
  }

  if (stage === "landing") {
    return (
      <LandingScreen
        onUploadFile={handleLandingUpload}
        onUseSample={handleLandingUseSample}
        onRawExportFile={handleLandingRawExport}
        rawStatus={formatStatus}
      />
    );
  }

  if (stage === "review") {
    return (
      <DataReadyScreen
        rows={masterRows}
        onContinue={() => setStage("workspace")}
        onStartOver={() => setStage("landing")}
      />
    );
  }

  const activeViewId: ViewId | null = section === "overview" || section === "report" ? null : section;

  const filterSummary =
    [filters.region, filters.channel, filters.category, filters.vendor].filter((v) => v !== "All").join(" \u00b7 ") ||
    "All data";
  const filterSummaryWithPeriod = filters.period !== "All time" ? `${filterSummary} \u00b7 ${filters.period}` : filterSummary;

  const uploadedStats = (() => {
    if (usingSample || !masterRows.length) return null;
    const skus = new Set(masterRows.map((r) => r.Product)).size;
    const categories = new Set(masterRows.map((r) => r.Category)).size;
    const regions = new Set(masterRows.map((r) => r.Region)).size;
    const times = masterRows.map((r) => new Date(r.Date).getTime()).filter((t) => !isNaN(t));
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const range = times.length ? `${fmt(new Date(Math.min(...times)))} \u2013 ${fmt(new Date(Math.max(...times)))}` : "\u2014";
    return { rows: masterRows.length, skus, categories, regions, range };
  })();

  return (
    <main className="min-h-screen pb-24">
      <ProgressTracker current={3} />
      {bannerVisible && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 text-sm sm:px-8">
          {usingSample ? (
            <p className="text-ink-hi">
              <span className="font-semibold text-accent-soft">Sample Data Loaded</span> {"\u2014"} {SAMPLE_META.rows.toLocaleString()} real
              CPG transactions {"\u00b7"} {SAMPLE_META.skus} SKUs {"\u00b7"} {SAMPLE_META.categories} categories {"\u00b7"} {SAMPLE_META.regions} regions
              {" \u00b7 "} {SAMPLE_META.range}. Upload your own file from the start screen to replace it.
            </p>
          ) : (
            <p className="text-ink-hi">
              <span className="font-semibold text-accent-soft">Your Data Loaded</span> {"\u2014"} {uploadedStats?.rows.toLocaleString() ?? masterRows.length} transactions
              {" \u00b7 "} {uploadedStats?.skus ?? "\u2014"} SKUs {"\u00b7"} {uploadedStats?.categories ?? "\u2014"} categories {"\u00b7"} {uploadedStats?.regions ?? "\u2014"} regions
              {uploadedStats ? ` \u00b7 ${uploadedStats.range}` : ""}.
            </p>
          )}
          <button onClick={() => setBannerVisible(false)} className="shrink-0 text-ink-lo hover:text-ink-hi">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold">Revenue Growth OS</span>
        </div>
        <button onClick={() => setStage("landing")} className="text-xs font-medium text-ink-mid hover:text-ink-hi">
          Upload new data
        </button>
      </header>

      <nav aria-label="Analytics navigation" className="flex items-center gap-1 overflow-x-auto border-b border-line px-4 py-2 sm:px-8">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              setSection(item.section);
              setMoreOpen(false);
            }}
            aria-current={section === item.section ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              section === item.section ? "bg-base-800 text-ink-hi" : "text-ink-lo hover:bg-base-850 hover:text-ink-hi"
            }`}
          >
            {item.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        <Link
          href="/decision-lab"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-ink-lo hover:bg-base-850 hover:text-ink-hi"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          What-If Analysis
        </Link>
        <button
          onClick={() => {
            setSection("report");
            setMoreOpen(false);
          }}
          aria-current={section === "report" ? "page" : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            section === "report" ? "bg-base-800 text-ink-hi" : "text-ink-lo hover:bg-base-850 hover:text-ink-hi"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Executive Report
        </button>
        <span className="mx-1 h-4 w-px bg-line" />
        <div className="relative shrink-0">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              MORE_VIEW_IDS.includes(section as ViewId)
                ? "bg-base-800 text-ink-hi"
                : "text-ink-lo hover:bg-base-850 hover:text-ink-hi"
            }`}
          >
            More
            <ChevronDown className={`h-3 w-3 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>
          {moreOpen && (
            <>
              <button
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-line bg-base-900 p-1 shadow-lg"
              >
                {MORE_VIEW_IDS.map((id) => (
                  <button
                    key={id}
                    role="menuitem"
                    onClick={() => {
                      setSection(id);
                      setMoreOpen(false);
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                      section === id ? "bg-base-800 text-ink-hi" : "text-ink-lo hover:bg-base-850 hover:text-ink-hi"
                    }`}
                  >
                    {VIEW_META[id].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>

      {/* ONE FOCUSED WORKSPACE AT A TIME */}
      <section className="px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {section !== "report" && (
            <FilterBar filters={filters} setFilters={setFilters} onApply={handleGenerate} {...dims} />
          )}

          {analysis ? (
            <>
              {section === "overview" && <OverviewPage analysis={analysis} rows={masterRows} filters={filters} />}
              {section === "report" && (
                <ExecutiveReportPage
                  analysis={analysis}
                  exportBusy={exportBusy}
                  filterSummary={filterSummaryWithPeriod}
                  onExportMaster={handleExportMaster}
                  onExportJson={handleExportJson}
                  onExportPptx={handleExportPptx}
                />
              )}
              {activeViewId && <ViewPanel view={analysis[activeViewId]} />}
            </>
          ) : section === "report" ? (
            <ExecutiveReportPage
              analysis={null}
              exportBusy={exportBusy}
              filterSummary={filterSummaryWithPeriod}
              onExportMaster={handleExportMaster}
              onExportJson={handleExportJson}
              onExportPptx={handleExportPptx}
            />
          ) : (
            <div className="rounded-xl2 border border-dashed border-base-600 px-6 py-12 text-center">
              <p className="text-sm text-ink-mid">
                Preparing your analysis from {usingSample ? "the sample data" : "your uploaded dataset"}
                {"\u2026"}
              </p>
            </div>
          )}
        </div>
      </section>
      <AICopilot rows={masterRows} filters={filters} activeView={activeViewId ?? "revenue"} />
    </main>
  );
}
