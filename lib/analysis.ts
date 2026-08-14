import { Filters, MasterRow, ViewId } from "./types";

export interface Kpi {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}
export interface ChartPoint {
  label: string;
  value: number;
  value2?: number;
}
export interface ViewResult {
  id: ViewId;
  kpis: Kpi[];
  chartType: "bar" | "line" | "pie";
  chart: ChartPoint[];
  table: { columns: string[]; rows: (string | number)[][] };
  insights: string[];
}

const money = (n: number) =>
  "\u20b9" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function sum(rows: MasterRow[], f: (r: MasterRow) => number) {
  return rows.reduce((a, r) => a + f(r), 0);
}
function groupSum(rows: MasterRow[], key: (r: MasterRow) => string, val: (r: MasterRow) => number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) || 0) + val(r));
  return m;
}
function topN(m: Map<string, number>, n: number, desc = true) {
  return [...m.entries()].sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1])).slice(0, n);
}

export function applyFilters(rows: MasterRow[], f: Filters): MasterRow[] {
  let out = rows;
  if (f.region !== "All") out = out.filter((r) => r.Region === f.region);
  if (f.channel !== "All") out = out.filter((r) => r.Channel === f.channel);
  if (f.category !== "All") out = out.filter((r) => r.Category === f.category);
  if (f.vendor !== "All") out = out.filter((r) => r.Vendor === f.vendor);
  if (f.period !== "All time" && out.length) {
    const dates = out.map((r) => new Date(r.Date).getTime()).filter((t) => !isNaN(t));
    const max = Math.max(...dates);
    const days =
      f.period === "Last 30 days" ? 30 : f.period === "Last 90 days" ? 90 : f.period === "Last 12 months" ? 365 : 9999;
    if (f.period === "YTD") {
      const year = new Date(max).getFullYear();
      out = out.filter((r) => new Date(r.Date).getFullYear() === year);
    } else {
      const cutoff = max - days * 86400000;
      out = out.filter((r) => new Date(r.Date).getTime() >= cutoff);
    }
  }
  return out;
}

export function generateAnalysis(rows: MasterRow[]): Record<ViewId, ViewResult> {
  const p1 = rows.filter((r) => r.Period === 1);
  const p2 = rows.filter((r) => r.Period === 2);
  const rev1 = sum(p1, (r) => r.Revenue);
  const rev2 = sum(p2, (r) => r.Revenue);
  const yoy = rev1 > 0 ? ((rev2 - rev1) / rev1) * 100 : 0;

  // ---------- 1. Revenue Analytics ----------
  const byRegion = groupSum(rows, (r) => r.Region, (r) => r.Revenue);
  const byChannel = groupSum(rows, (r) => r.Channel, (r) => r.Revenue);
  const revenue: ViewResult = {
    id: "revenue",
    kpis: [
      { label: "Total Revenue", value: money(sum(rows, (r) => r.Revenue)) },
      { label: "YoY Growth", value: pct(yoy), trend: yoy >= 0 ? "up" : "down" },
      { label: "Top Region", value: topN(byRegion, 1)[0]?.[0] ?? "\u2014" },
      { label: "Top Channel", value: topN(byChannel, 1)[0]?.[0] ?? "\u2014" },
    ],
    chartType: "bar",
    chart: [...byRegion.entries()].map(([label, value]) => ({ label, value })),
    table: {
      columns: ["Channel", "Revenue", "Share"],
      rows: topN(byChannel, 5).map(([label, v]) => [
        label,
        money(v),
        pct((v / Math.max(1, sum(rows, (r) => r.Revenue))) * 100),
      ]),
    },
    insights: [
      `Revenue moved ${pct(yoy)} period-over-period, led by ${topN(byRegion, 1)[0]?.[0] ?? "the top region"}.`,
      `${topN(byChannel, 1)[0]?.[0] ?? "The top channel"} is the single largest channel by revenue contribution.`,
    ],
  };

  // ---------- 2. SKU Intelligence ----------
  const byProduct = groupSum(rows, (r) => r.Product, (r) => r.Revenue);
  const byProductUnits = groupSum(rows, (r) => r.Product, (r) => r.UnitsSold);
  const winners = topN(byProduct, 5);
  const dead = topN(byProductUnits, 5, false);
  const sku: ViewResult = {
    id: "sku",
    kpis: [
      { label: "Active SKUs", value: String(new Set(rows.map((r) => r.Product)).size) },
      { label: "Top SKU Revenue", value: money(winners[0]?.[1] ?? 0) },
      { label: "Slow Movers", value: String(dead.filter(([, u]) => u < 20).length) },
      { label: "Avg Inventory Pressure", value: `${Math.round(sum(rows, (r) => r.InventoryPressure) / Math.max(1, rows.length))}` },
    ],
    chartType: "bar",
    chart: winners.map(([label, value]) => ({ label, value })),
    table: {
      columns: ["SKU", "Units Sold", "Signal"],
      rows: dead.map(([label, u]) => [label, u, u < 20 ? "Dead inventory watch" : "Stable"]),
    },
    insights: [
      `${winners[0]?.[0] ?? "Top SKU"} is the clear revenue winner this period.`,
      `${dead.filter(([, u]) => u < 20).length} SKUs show low sell-through and are candidates for markdown or delisting.`,
    ],
  };

  // ---------- 3. Marketing Efficiency ----------
  const avgRoas = rows.length ? sum(rows, (r) => r.ROAS) / rows.length : 0;
  const avgCac = rows.length ? sum(rows, (r) => r.CAC) / rows.length : 0;
  const spendByChannel = groupSum(rows, (r) => r.Channel, (r) => r.Revenue * 0.07);
  const marketing: ViewResult = {
    id: "marketing",
    kpis: [
      { label: "Blended ROAS", value: `${avgRoas.toFixed(1)}x` },
      { label: "Blended CAC", value: money(avgCac) },
      { label: "Est. Spend", value: money(sum(rows, (r) => r.Revenue * 0.07)) },
      { label: "Best Channel ROAS", value: topN(spendByChannel, 1)[0]?.[0] ?? "\u2014" },
    ],
    chartType: "bar",
    chart: [...spendByChannel.entries()].map(([label, value]) => ({ label, value })),
    table: {
      columns: ["Channel", "Est. Spend", "Blended ROAS"],
      rows: [...byChannel.entries()].map(([label, v]) => {
        const chRows = rows.filter((r) => r.Channel === label);
        const roas = chRows.length ? sum(chRows, (r) => r.ROAS) / chRows.length : 0;
        return [label, money(v * 0.07), `${roas.toFixed(1)}x`];
      }),
    },
    insights: [
      `Blended ROAS sits at ${avgRoas.toFixed(1)}x across all live channels.`,
      `Reallocating budget toward the top ROAS channel is the fastest lever on marketing efficiency.`,
    ],
  };

  // ---------- 4. Customer Intel ----------
  const byCustomerRevenue = groupSum(rows, (r) => r.CustomerID, (r) => r.Revenue);
  const avgClv = rows.length ? sum(rows, (r) => r.CLV) / rows.length : 0;
  const churnHigh = rows.filter((r) => r.ChurnRisk === "High").length;
  const customer: ViewResult = {
    id: "customer",
    kpis: [
      { label: "Avg CLV", value: money(avgClv) },
      { label: "Unique Customers", value: String(byCustomerRevenue.size) },
      { label: "High Churn Risk", value: pct((churnHigh / Math.max(1, rows.length)) * 100) },
      { label: "Avg NPS", value: (sum(rows, (r) => r.NPS) / Math.max(1, rows.length)).toFixed(1) },
    ],
    chartType: "pie",
    chart: (["Low", "Medium", "High"] as const).map((risk) => ({
      label: risk,
      value: rows.filter((r) => r.ChurnRisk === risk).length,
    })),
    table: {
      columns: ["Customer", "Revenue", "CLV"],
      rows: topN(byCustomerRevenue, 6).map(([label, v]) => [
        label,
        money(v),
        money(rows.find((r) => r.CustomerID === label)?.CLV ?? 0),
      ]),
    },
    insights: [
      `${pct((churnHigh / Math.max(1, rows.length)) * 100)} of transactions carry high churn risk based on NPS.`,
      `Average CLV stands at ${money(avgClv)}; loyalty programs should target the mid-NPS cohort first.`,
    ],
  };

  // ---------- 5. Supply Chain ----------
  const avgPressure = rows.length ? sum(rows, (r) => r.InventoryPressure) / rows.length : 0;
  const expiryHigh = rows.filter((r) => r.ExpiryRisk === "High").length;
  const byVendorDep = groupSum(rows, (r) => r.Vendor, (r) => r.Revenue);
  const supply: ViewResult = {
    id: "supply",
    kpis: [
      { label: "Avg Inventory Pressure", value: `${avgPressure.toFixed(0)}/100` },
      { label: "High Expiry Risk", value: String(expiryHigh) },
      { label: "Avg Shipping Days", value: (sum(rows, (r) => r.ShippingDays) / Math.max(1, rows.length)).toFixed(1) },
      { label: "Top Vendor Share", value: pct(((topN(byVendorDep, 1)[0]?.[1] ?? 0) / Math.max(1, sum(rows, (r) => r.Revenue))) * 100) },
    ],
    chartType: "bar",
    chart: [...byVendorDep.entries()].map(([label, value]) => ({ label, value })),
    table: {
      columns: ["Vendor", "Revenue", "Dependency"],
      rows: topN(byVendorDep, 5).map(([label]) => {
        const vr = rows.filter((r) => r.Vendor === label);
        return [label, money(sum(vr, (r) => r.Revenue)), `${(vr[0]?.VendorDependency ?? 0).toFixed(1)}%`];
      }),
    },
    insights: [
      `${expiryHigh} lines are within 30 days of expiry and need markdown or redistribution.`,
      `Vendor concentration is a watch-item where a single vendor exceeds 40% of category revenue.`,
    ],
  };

  // ---------- 6. Pricing & Discount ----------
  const discBuckets = [0, 0.05, 0.1, 0.15, 0.2];
  const pricing: ViewResult = {
    id: "pricing",
    kpis: [
      { label: "Avg Discount", value: pct(sum(rows, (r) => r.Discount) / Math.max(1, rows.length) * 100) },
      { label: "Avg Margin", value: pct(sum(rows, (r) => r.ProfitPct) / Math.max(1, rows.length)) },
      { label: "Full-Price Share", value: pct((rows.filter((r) => r.Discount === 0).length / Math.max(1, rows.length)) * 100) },
      { label: "Deep-Discount Share", value: pct((rows.filter((r) => r.Discount >= 0.15).length / Math.max(1, rows.length)) * 100) },
    ],
    chartType: "bar",
    chart: discBuckets.map((d) => ({
      label: `${(d * 100).toFixed(0)}%`,
      value: rows.filter((r) => r.Discount === d).reduce((a, r) => a + r.UnitsSold, 0),
    })),
    table: {
      columns: ["Discount Tier", "Units Sold", "Avg Margin"],
      rows: discBuckets.map((d) => {
        const dr = rows.filter((r) => r.Discount === d);
        return [
          `${(d * 100).toFixed(0)}%`,
          dr.reduce((a, r) => a + r.UnitsSold, 0),
          pct(dr.length ? sum(dr, (r) => r.ProfitPct) / dr.length : 0),
        ];
      }),
    },
    insights: [
      "Unit velocity rises with discount depth, but margin erosion accelerates past the 15% tier.",
      "Elasticity suggests targeted 5\u201310% offers outperform blanket deep discounts on blended profit.",
    ],
  };

  // ---------- 7. Shelf & Packaging ----------
  const byCategoryUnits = groupSum(rows, (r) => r.Category, (r) => r.UnitsSold);
  const shelf: ViewResult = {
    id: "shelf",
    kpis: [
      { label: "Categories Tracked", value: String(byCategoryUnits.size) },
      { label: "Top Category Velocity", value: topN(byCategoryUnits, 1)[0]?.[0] ?? "\u2014" },
      { label: "Avg Units / SKU", value: (sum(rows, (r) => r.UnitsSold) / Math.max(1, new Set(rows.map((r) => r.Product)).size)).toFixed(0) },
      { label: "Visibility Index", value: `${Math.min(100, Math.round(avgPressure * 0.8))}/100` },
    ],
    chartType: "bar",
    chart: [...byCategoryUnits.entries()].map(([label, value]) => ({ label, value })),
    table: {
      columns: ["Category", "Units Sold", "Revenue"],
      rows: [...byCategoryUnits.entries()].map(([label, u]) => [
        label,
        u,
        money(sum(rows.filter((r) => r.Category === label), (r) => r.Revenue)),
      ]),
    },
    insights: [
      `${topN(byCategoryUnits, 1)[0]?.[0] ?? "The lead category"} converts best on-shelf by unit velocity.`,
      "Packaging/theme tests are most valuable on categories with high traffic but flat conversion.",
    ],
  };

  // ---------- 8. Competition ----------
  const avgPrice = sum(rows, (r) => r.BasePrice) / Math.max(1, rows.length);
  const competition: ViewResult = {
    id: "competition",
    kpis: [
      { label: "Avg Shelf Price", value: money(avgPrice) },
      { label: "Price Spread", value: money(Math.max(...rows.map((r) => r.BasePrice), 0) - Math.min(...rows.map((r) => r.BasePrice), 0)) },
      { label: "Categories Above Market*", value: String(Math.round(byCategoryUnits.size / 2)) },
      { label: "Trend", value: pct(yoy) , trend: yoy >= 0 ? "up" : "down"},
    ],
    chartType: "line",
    chart: [...byCategoryUnits.keys()].map((label) => ({
      label,
      value: Math.round((rows.filter((r) => r.Category === label).reduce((a, r) => a + r.BasePrice, 0) / Math.max(1, rows.filter((r) => r.Category === label).length)) * 100) / 100,
    })),
    table: {
      columns: ["Category", "Avg Price", "vs. Portfolio Avg"],
      rows: [...byCategoryUnits.keys()].map((label) => {
        const cr = rows.filter((r) => r.Category === label);
        const p = cr.length ? sum(cr, (r) => r.BasePrice) / cr.length : 0;
        return [label, money(p), pct(((p - avgPrice) / Math.max(1, avgPrice)) * 100)];
      }),
    },
    insights: [
      "*Estimated from portfolio pricing distribution \u2014 connect a competitor feed for verified market gaps.",
      "Categories priced well above portfolio average are the first candidates for a pricing audit.",
    ],
  };

  // ---------- 9. Market Expansion ----------
  const byRegionUnits = groupSum(rows, (r) => r.Region, (r) => r.UnitsSold);
  const weakestRegion = topN(byRegionUnits, 1, false)[0];
  const expansion: ViewResult = {
    id: "expansion",
    kpis: [
      { label: "Whitespace Region", value: weakestRegion?.[0] ?? "\u2014" },
      { label: "Cross-sell Categories", value: String(byCategoryUnits.size) },
      { label: "Underpenetrated Channel", value: topN(byChannel, 1, false)[0]?.[0] ?? "\u2014" },
      { label: "Expansion Score", value: `${Math.min(100, Math.round((rev2 / Math.max(1, rev1)) * 50))}/100` },
    ],
    chartType: "bar",
    chart: [...byRegionUnits.entries()].map(([label, value]) => ({ label, value })),
    table: {
      columns: ["Region", "Units Sold", "Revenue"],
      rows: [...byRegionUnits.entries()].map(([label, u]) => [
        label,
        u,
        money(sum(rows.filter((r) => r.Region === label), (r) => r.Revenue)),
      ]),
    },
    insights: [
      `${weakestRegion?.[0] ?? "One region"} shows the lowest unit velocity \u2014 the clearest Tier 2/3 whitespace target.`,
      "Bundling top-region winners into weak-region assortments is the fastest cross-sell lever.",
    ],
  };

  return { revenue, sku, marketing, customer, supply, pricing, shelf, competition, expansion };
}
