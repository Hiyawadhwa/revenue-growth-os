"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, Check, ChevronDown, Clipboard, CornerDownLeft, Loader2, MessageSquare,
  RefreshCw, Send, Sparkles, Trash2, X,
} from "lucide-react";
import { Filters, MasterRow, ViewId, VIEW_META } from "@/lib/types";
import { applyFilters } from "@/lib/analysis";

type Answer = {
  summary: string;
  insights: string[];
  metrics: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }[];
  recommendations: string[];
  confidence: number;
};

type Message = { id: number; role: "user" | "assistant"; text?: string; answer?: Answer };

const SUGGESTIONS = [
  "Why did revenue decline?", "Which region is performing best?", "Which SKU is underperforming?",
  "What are the biggest growth opportunities?", "Explain the current dashboard.", "What should I focus on?",
];

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const percent = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function getAnswer(question: string, rows: MasterRow[], filters: Filters, activeView: ViewId): Answer {
  const scoped = applyFilters(rows, filters);
  const data = scoped.length ? scoped : rows;
  const current = data.filter((r) => r.Period === 2);
  const prior = data.filter((r) => r.Period === 1);
  const total = current.reduce((s, r) => s + r.Revenue, 0);
  const previous = prior.reduce((s, r) => s + r.Revenue, 0);
  const change = previous ? ((total - previous) / previous) * 100 : 0;
  const by = (key: "Region" | "Product") => {
    const map = new Map<string, number>();
    current.forEach((r) => map.set(r[key], (map.get(r[key]) || 0) + r.Revenue));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const regions = by("Region");
  const products = by("Product");
  const empty: [string, number] = ["—", 0];
  const topRegion = regions[0] || empty;
  const lowestRegion = regions[regions.length - 1] || empty;
  const topProduct = products[0] || empty;
  const lowProduct = products[products.length - 1] || empty;
  const query = question.toLowerCase();
  const context = `${filters.region !== "All" ? `${filters.region} · ` : ""}${filters.channel !== "All" ? `${filters.channel} · ` : ""}${filters.period}`;
  const baseMetrics = [
    { label: "Current revenue", value: money(total), tone: total >= previous ? "positive" as const : "negative" as const },
    { label: "Period change", value: percent(change), tone: change >= 0 ? "positive" as const : "negative" as const },
    { label: "Top region", value: topRegion[0], tone: "positive" as const },
  ];

  if (query.includes("region")) return {
    summary: `${topRegion[0]} is the strongest region in the current selection, contributing ${money(topRegion[1])} in Period 2 revenue.`,
    insights: [`It leads ${lowestRegion[0]} by ${money(topRegion[1] - lowestRegion[1])}.`, `${topRegion[0]} accounts for ${((topRegion[1] / Math.max(total, 1)) * 100).toFixed(1)}% of current revenue.`, `This answer reflects ${context}.`],
    metrics: [...baseMetrics, { label: "Lowest region", value: lowestRegion[0], tone: "negative" }],
    recommendations: [`Protect availability and spend in ${topRegion[0]}.`, `Use the strongest ${topRegion[0]} SKU mix as a test plan for ${lowestRegion[0]}.`], confidence: 92,
  };
  if (query.includes("sku") || query.includes("underperform")) return {
    summary: `${lowProduct[0]} is the weakest revenue-contributing SKU in the active selection, while ${topProduct[0]} is the current leader.`,
    insights: [`${lowProduct[0]} generated ${money(lowProduct[1])} versus ${money(topProduct[1])} for the top SKU.`, `Review its sell-through alongside inventory before increasing discount depth.`, `The SKU view is based on ${context}.`],
    metrics: [...baseMetrics, { label: "Underperforming SKU", value: lowProduct[0], tone: "negative" }],
    recommendations: [`Check ${lowProduct[0]} for availability, price and channel fit.`, "Test a targeted offer before considering a broader markdown or delisting decision."], confidence: 87,
  };
  if (query.includes("decline") || query.includes("revenue")) return {
    summary: change < 0 ? `Revenue is down ${percent(change)} versus the prior period, primarily within the current filtered scope.` : `Revenue is up ${percent(change)} versus the prior period in the current filtered scope.`,
    insights: [`Current Period 2 revenue is ${money(total)} compared with ${money(previous)} previously.`, `${topRegion[0]} remains the largest regional contributor.`, `The active ${VIEW_META[activeView].label} view may reveal the next drill-down.`],
    metrics: baseMetrics, recommendations: ["Prioritize the lowest-performing region and SKU combination.", "Validate whether the change is driven by volume, price, or discount mix before reallocating spend."], confidence: 89,
  };
  if (query.includes("dashboard") || query.includes("explain")) return {
    summary: `You are viewing ${VIEW_META[activeView].label}, scoped to ${context}. The dashboard compares current Period 2 performance with Period 1 where available.`,
    insights: [`Revenue currently stands at ${money(total)}.`, `${topRegion[0]} is the leading region, and ${topProduct[0]} is the leading SKU.`, "Use the view tabs to move from headline performance into SKU, marketing, customer, supply, and pricing drivers."],
    metrics: baseMetrics, recommendations: ["Start with the largest negative variance, then confirm the root cause in the relevant view.", "Apply a narrower filter to turn this overview into an action list."], confidence: 95,
  };
  return {
    summary: `The clearest near-term opportunity is to scale what is working in ${topRegion[0]} and resolve the weakest SKU and regional pockets before adding new complexity.`,
    insights: [`${topRegion[0]} leads with ${money(topRegion[1])} in current revenue.`, `${lowProduct[0]} is the smallest current revenue contributor.`, `Overall revenue is ${percent(change)} period-over-period for ${context}.`],
    metrics: [...baseMetrics, { label: "Top SKU", value: topProduct[0], tone: "positive" }],
    recommendations: ["Shift a small, measurable share of investment toward the best-performing region and channel mix.", `Create a recovery plan for ${lowProduct[0]} with an owner, hypothesis, and two-week success metric.`], confidence: 86,
  };
}

function AnswerCard({ answer, onCopy, copied }: { answer: Answer; onCopy: () => void; copied: boolean }) {
  return <div className="rounded-xl border border-accent-dim/60 bg-base-850/80 p-3.5 shadow-lg shadow-base-950/20">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-accent-soft"><Sparkles className="h-3.5 w-3.5" /> Revenue analyst</div><button onClick={onCopy} aria-label="Copy response" className="text-ink-lo hover:text-ink-hi">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Clipboard className="h-4 w-4" />}</button></div>
    <section className="mt-3"><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">Summary</h4><p className="mt-1 text-sm leading-5 text-ink-hi">{answer.summary}</p></section>
    <section className="mt-4"><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">Key insights</h4><ul className="mt-1.5 space-y-1.5">{answer.insights.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-ink-mid"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-soft" />{item}</li>)}</ul></section>
    <section className="mt-4"><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">Supporting metrics</h4><div className="mt-2 grid grid-cols-2 gap-2">{answer.metrics.map((m) => <div key={m.label} className="rounded-lg border border-line bg-base-900 px-2.5 py-2"><p className="text-[10px] text-ink-lo">{m.label}</p><p className={`mt-0.5 text-xs font-semibold ${m.tone === "negative" ? "text-rose-300" : m.tone === "positive" ? "text-accent-soft" : "text-ink-hi"}`}>{m.value}</p></div>)}</div></section>
    <section className="mt-4"><h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">Recommendations</h4><ol className="mt-1.5 space-y-1.5">{answer.recommendations.map((item, i) => <li key={item} className="flex gap-2 text-xs leading-5 text-ink-mid"><span className="font-mono text-accent-soft">0{i + 1}</span>{item}</li>)}</ol></section>
    <div className="mt-4 flex items-center justify-between border-t border-line pt-3"><span className="text-[10px] uppercase tracking-[0.12em] text-ink-lo">Confidence score</span><span className="text-xs font-semibold text-accent-soft">{answer.confidence}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base-800"><div className="h-full rounded-full bg-accent" style={{ width: `${answer.confidence}%` }} /></div>
  </div>;
}

export default function AICopilot({ rows, filters, activeView }: { rows: MasterRow[]; filters: Filters; activeView: ViewId }) {
  const [open, setOpen] = useState(false); const [input, setInput] = useState(""); const [messages, setMessages] = useState<Message[]>([]); const [loading, setLoading] = useState(false); const [copied, setCopied] = useState<number | null>(null); const messageEnd = useRef<HTMLDivElement>(null);
  const filterLabel = useMemo(() => [filters.region, filters.channel, filters.category].filter((x) => x !== "All").join(" · ") || "All data", [filters]);
  useEffect(() => { messageEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  function plain(answer: Answer) { return `Summary\n${answer.summary}\n\nKey Insights\n${answer.insights.join("\n")}\n\nSupporting Metrics\n${answer.metrics.map((m) => `${m.label}: ${m.value}`).join("\n")}\n\nRecommendations\n${answer.recommendations.join("\n")}\n\nConfidence Score: ${answer.confidence}%`; }
  async function ask(question: string) { if (!question.trim() || loading) return; const id = Date.now(); setMessages((m) => [...m, { id, role: "user", text: question }]); setInput(""); setLoading(true); await new Promise((resolve) => setTimeout(resolve, 850)); setMessages((m) => [...m, { id: id + 1, role: "assistant", answer: getAnswer(question, rows, filters, activeView) }]); setLoading(false); }
  function submit(e: FormEvent) { e.preventDefault(); ask(input); }
  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-accent-soft/50 bg-accent px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-accent/20 transition hover:bg-accent-soft hover:text-base-950 sm:bottom-7 sm:right-7" aria-label="Open AI Copilot"><MessageSquare className="h-5 w-5" /><span>AI Copilot</span><span className="hidden h-2 w-2 rounded-full bg-emerald-300 sm:block" /></button>
    {open && <><button aria-label="Close AI Copilot" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-base-950/45 backdrop-blur-[1px]" />
      <aside role="dialog" aria-modal="true" aria-label="AI Revenue Copilot" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-line bg-base-900 shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between border-b border-line px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent"><Bot className="h-5 w-5 text-white" /></div><div><h2 className="font-display font-bold text-ink-hi">AI Copilot</h2><p className="text-[11px] text-ink-lo">Business analyst · Context aware</p></div></div><div className="flex gap-1"><button onClick={() => setMessages([])} disabled={!messages.length} aria-label="Clear conversation" className="rounded-lg p-2 text-ink-lo hover:bg-base-850 hover:text-ink-hi disabled:opacity-30"><Trash2 className="h-4 w-4" /></button><button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-2 text-ink-lo hover:bg-base-850 hover:text-ink-hi"><X className="h-5 w-5" /></button></div></header>
        <div className="border-b border-line bg-base-850/50 px-5 py-2.5"><div className="flex items-center gap-2 text-[11px] text-ink-mid"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>Using: {filterLabel}</span><span className="text-ink-lo">·</span><span>{VIEW_META[activeView].label}</span></div></div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{!messages.length && !loading ? <div><div className="rounded-xl border border-accent-dim/50 bg-accent-dim/15 p-4"><p className="text-sm font-medium text-ink-hi">Ask about the revenue model</p><p className="mt-1 text-xs leading-5 text-ink-mid">I’ll use your active dashboard filters and selected analysis view to frame the answer.</p></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-lo">Suggested questions</p><div className="mt-2 grid gap-2">{SUGGESTIONS.map((q) => <button key={q} onClick={() => ask(q)} className="flex items-center justify-between rounded-lg border border-line bg-base-850 px-3 py-2.5 text-left text-xs text-ink-mid transition hover:border-accent-dim hover:text-ink-hi"><span>{q}</span><ChevronDown className="h-3.5 w-3.5 -rotate-90 text-accent-soft" /></button>)}</div></div> : <div className="space-y-4">{messages.map((m) => m.role === "user" ? <div key={m.id} className="ml-10 rounded-xl rounded-tr-sm bg-accent px-3.5 py-2.5 text-sm text-white">{m.text}</div> : <AnswerCard key={m.id} answer={m.answer!} copied={copied === m.id} onCopy={() => { navigator.clipboard?.writeText(plain(m.answer!)); setCopied(m.id); setTimeout(() => setCopied(null), 1600); }} />)}{loading && <div className="flex items-center gap-2 rounded-xl border border-line bg-base-850 px-3.5 py-3 text-xs text-ink-mid"><Loader2 className="h-4 w-4 animate-spin text-accent-soft" />Analyzing your current dashboard<span className="inline-flex gap-0.5"><i className="h-1 w-1 animate-bounce rounded-full bg-accent-soft" /><i className="h-1 w-1 animate-bounce rounded-full bg-accent-soft [animation-delay:150ms]" /><i className="h-1 w-1 animate-bounce rounded-full bg-accent-soft [animation-delay:300ms]" /></span></div>}<div ref={messageEnd} /></div>}</div>
        {messages.some((m) => m.role === "assistant") && <div className="flex gap-2 border-t border-line px-5 py-2"><button onClick={() => { const last = [...messages].reverse().find((m) => m.role === "user"); if (last?.text) ask(last.text); }} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-lo hover:text-accent-soft"><RefreshCw className="h-3.5 w-3.5" />Regenerate response</button><button onClick={() => setMessages([])} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-lo hover:text-accent-soft"><Trash2 className="h-3.5 w-3.5" />Clear conversation</button></div>}
        <form onSubmit={submit} className="border-t border-line bg-base-900 p-4"><div className="flex items-end gap-2 rounded-xl border border-line bg-base-850 px-3 py-2 focus-within:border-accent"><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about revenue, regions, SKUs…" rows={1} className="max-h-24 flex-1 resize-none bg-transparent py-1 text-sm text-ink-hi outline-none placeholder:text-ink-lo" /><button disabled={!input.trim() || loading} aria-label="Send question" className="rounded-lg bg-accent p-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div><p className="mt-2 flex items-center gap-1 text-[10px] text-ink-lo"><CornerDownLeft className="h-3 w-3" />Mock analyst mode · API-ready response structure</p></form>
      </aside></>}
  </>;
}
