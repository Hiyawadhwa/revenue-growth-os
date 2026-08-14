"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, Lightbulb, Loader2, Target } from "lucide-react";
import { Filters, MasterRow } from "@/lib/types";
import { generateRecommendations, SmartRecommendation } from "@/lib/recommendations";

const priorityClass = { High: "border-rose-400/30 bg-rose-400/10 text-rose-200", Medium: "border-amber-400/30 bg-amber-400/10 text-amber-200", Low: "border-sky-400/30 bg-sky-400/10 text-sky-200" };

function Skeleton() {
  return <div className="grid gap-3 lg:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="card animate-pulse p-4"><div className="h-3 w-20 rounded bg-base-800" /><div className="mt-3 h-5 w-3/4 rounded bg-base-800" /><div className="mt-3 h-3 w-full rounded bg-base-800" /><div className="mt-2 h-3 w-5/6 rounded bg-base-800" /><div className="mt-5 h-8 rounded bg-base-800" /></div>)}</div>;
}

function RecommendationCard({ item }: { item: SmartRecommendation }) {
  const [expanded, setExpanded] = useState(false); const [queued, setQueued] = useState(false);
  function simulate() { sessionStorage.setItem("revenue-growth-os:recommendation", JSON.stringify(item)); window.location.assign("/decision-lab"); setQueued(true); }
  return <article className="card flex h-full flex-col p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent-dim hover:shadow-lg hover:shadow-accent/5">
    <div className="flex items-start justify-between gap-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityClass[item.priority]}`}>{item.priority} priority</span><span className="text-xs font-semibold text-accent-soft">{item.confidence}% confidence</span></div>
    <h3 className="mt-3 font-display text-base font-bold text-ink-hi">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-ink-mid">{item.explanation}</p>
    <div className="mt-4 grid grid-cols-2 gap-2">{item.metrics.map((metric) => <div key={metric.label} className="rounded-lg border border-line bg-base-850 px-2.5 py-2"><p className="text-[10px] text-ink-lo">{metric.label}</p><p className="mt-0.5 text-xs font-semibold text-ink-hi">{metric.value}</p></div>)}</div>
    <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-dim/15 px-2.5 py-2 text-xs"><Target className="h-3.5 w-3.5 shrink-0 text-accent-soft" /><span className="text-ink-mid">{item.impact}</span></div>
    {expanded && <div className="mt-3 border-t border-line pt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-lo">Recommended next steps</p><ul className="mt-2 space-y-1.5">{item.details.map((detail) => <li key={detail} className="flex gap-2 text-xs leading-5 text-ink-mid"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-soft" />{detail}</li>)}</ul></div>}
    <div className="mt-auto flex gap-2 pt-4"><button onClick={() => setExpanded((open) => !open)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line px-2 py-2 text-xs font-medium text-ink-mid hover:border-accent-dim hover:text-ink-hi">View details <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} /></button><button onClick={simulate} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent px-2 py-2 text-xs font-semibold text-white hover:bg-accent-soft hover:text-base-950"><FlaskConical className="h-3.5 w-3.5" />{queued ? "Prepared" : "Simulate Impact"}</button></div>
  </article>;
}

export default function AIRecommendations({ rows, filters }: { rows: MasterRow[]; filters: Filters }) {
  const recommendations = useMemo(() => generateRecommendations(rows, filters), [rows, filters]); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const timer = setTimeout(() => setLoading(false), 320); return () => clearTimeout(timer); }, [recommendations]);
  return <section aria-label="Recommended actions" className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="step-num">RECOMMENDED ACTIONS</p><h2 className="mt-1 font-display text-xl font-bold text-ink-hi">Where to focus next</h2><p className="mt-1 text-xs text-ink-mid">Prioritized actions based on your current filters and business performance.</p></div><div className="flex items-center gap-1.5 text-[11px] text-ink-lo"><Lightbulb className="h-3.5 w-3.5 text-accent-soft" />Based on current data</div></div>{loading ? <Skeleton /> : recommendations.length ? <div className="grid gap-3 lg:grid-cols-3">{recommendations.map((item) => <RecommendationCard key={item.id} item={item} />)}</div> : <div className="card flex items-center gap-2 p-4 text-sm text-ink-mid"><Loader2 className="h-4 w-4 animate-spin text-accent-soft" />No recommended actions are available for this selection.</div>}</section>;
}
