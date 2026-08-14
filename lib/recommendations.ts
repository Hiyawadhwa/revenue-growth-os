import { applyFilters } from "./analysis";
import { Filters, MasterRow } from "./types";

export type RecommendationPriority = "High" | "Medium" | "Low";

export type SmartRecommendation = {
  id: string;
  title: string;
  explanation: string;
  metrics: { label: string; value: string }[];
  impact: string;
  confidence: number;
  priority: RecommendationPriority;
  details: string[];
  simulation: { lever: string; entity: string; baseline: number; projectedChange: number; unit: "revenue" | "margin" | "roas" };
};

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const signedPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function sum(rows: MasterRow[], f: (row: MasterRow) => number) {
  return rows.reduce((total, row) => total + f(row), 0);
}

function groupedRevenue(rows: MasterRow[], key: "Region" | "Channel" | "Product") {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row[key], (map.get(row[key]) || 0) + row.Revenue));
  return map;
}

function growthFor(rows: MasterRow[], key: "Region" | "Channel" | "Product") {
  const previous = groupedRevenue(rows.filter((row) => row.Period === 1), key);
  const current = groupedRevenue(rows.filter((row) => row.Period === 2), key);
  return [...current.entries()].map(([name, value]) => {
    const before = previous.get(name) || 0;
    return { name, value, before, growth: before ? ((value - before) / before) * 100 : 0 };
  });
}

/** Deterministic local recommendation engine. Replace this module with an AI service adapter when available. */
export function generateRecommendations(rows: MasterRow[], filters: Filters): SmartRecommendation[] {
  const scoped = applyFilters(rows, filters);
  const data = scoped.length ? scoped : rows;
  if (!data.length) return [];

  const current = data.filter((row) => row.Period === 2);
  const currentRevenue = sum(current, (row) => row.Revenue);
  const regions = growthFor(data, "Region");
  const channels = growthFor(data, "Channel");
  const products = growthFor(data, "Product");
  const avgDiscount = sum(current, (row) => row.Discount) / Math.max(current.length, 1);
  const avgMargin = sum(current, (row) => row.ProfitPct) / Math.max(current.length, 1);
  const highPressure = current.filter((row) => row.InventoryPressure >= 70);
  const recommendations: SmartRecommendation[] = [];

  const topRegion = [...regions].sort((a, b) => b.growth - a.growth || b.value - a.value)[0];
  if (topRegion) recommendations.push({
    id: "regional-growth", title: `Increase focus on ${topRegion.name}`,
    explanation: `${topRegion.name} combines ${signedPct(topRegion.growth)} period growth with ${money(topRegion.value)} in current revenue, making it the strongest place to scale proven demand.`,
    metrics: [{ label: "Period growth", value: signedPct(topRegion.growth) }, { label: "Current revenue", value: money(topRegion.value) }],
    impact: `Potential revenue upside: ${money(topRegion.value * 0.08)}`,
    confidence: Math.min(94, Math.max(74, Math.round(82 + Math.abs(topRegion.growth) / 3))), priority: topRegion.growth > 0 ? "High" : "Medium",
    details: ["Prioritize in-stock availability and the winning channel mix.", "Test an incremental budget or distribution increase before broad rollout."],
    simulation: { lever: "regional investment", entity: topRegion.name, baseline: topRegion.value, projectedChange: 8, unit: "revenue" },
  });

  const weakSku = [...products].sort((a, b) => a.growth - b.growth || a.value - b.value)[0];
  if (weakSku) recommendations.push({
    id: "sku-recovery", title: `Review underperforming SKU: ${weakSku.name}`,
    explanation: `${weakSku.name} has ${money(weakSku.value)} in current revenue and is moving ${signedPct(weakSku.growth)} against the prior period, signalling a need to diagnose demand, availability, or price fit.`,
    metrics: [{ label: "SKU growth", value: signedPct(weakSku.growth) }, { label: "Current revenue", value: money(weakSku.value) }],
    impact: `Recovery opportunity: ${money(Math.max(weakSku.value * 0.12, currentRevenue * 0.01))}`,
    confidence: weakSku.growth < 0 ? 89 : 79, priority: weakSku.growth < 0 ? "High" : "Medium",
    details: ["Check stock position, listing quality, and channel availability.", "Run a narrowly targeted offer only after confirming the root cause."],
    simulation: { lever: "SKU recovery", entity: weakSku.name, baseline: weakSku.value, projectedChange: 12, unit: "revenue" },
  });

  const bestChannel = [...channels].sort((a, b) => b.growth - a.growth || b.value - a.value)[0];
  if (bestChannel) recommendations.push({
    id: "channel-allocation", title: `Scale the ${bestChannel.name} channel playbook`,
    explanation: `${bestChannel.name} is showing ${signedPct(bestChannel.growth)} period growth and contributes ${money(bestChannel.value)} in current revenue within the selected dashboard context.`,
    metrics: [{ label: "Channel growth", value: signedPct(bestChannel.growth) }, { label: "Current revenue", value: money(bestChannel.value) }],
    impact: `Potential revenue upside: ${money(bestChannel.value * 0.06)}`,
    confidence: Math.min(91, Math.max(72, Math.round(80 + Math.abs(bestChannel.growth) / 4))), priority: bestChannel.growth > 0 ? "Medium" : "Low",
    details: ["Identify the SKU and region mix responsible for channel momentum.", "Reallocate in small increments and track incremental ROAS."],
    simulation: { lever: "channel allocation", entity: bestChannel.name, baseline: bestChannel.value, projectedChange: 6, unit: "revenue" },
  });

  if (avgDiscount >= 0.08) recommendations.push({
    id: "discount-discipline", title: "Reduce discount dependency",
    explanation: `The active selection is averaging ${(avgDiscount * 100).toFixed(1)}% discount while blended margin is ${avgMargin.toFixed(1)}%. This is a clear opportunity to test more disciplined offer tiers.`,
    metrics: [{ label: "Average discount", value: `${(avgDiscount * 100).toFixed(1)}%` }, { label: "Average margin", value: `${avgMargin.toFixed(1)}%` }],
    impact: `Expected margin impact: +${Math.max(0.6, avgDiscount * 18).toFixed(1)}%`, confidence: 86, priority: avgDiscount >= 0.12 ? "High" : "Medium",
    details: ["Prioritize the deepest-discount products with weak volume response.", "Compare a 5–10% targeted offer against blanket promotion before reducing depth."],
    simulation: { lever: "discount reduction", entity: "Selected portfolio", baseline: avgDiscount * 100, projectedChange: -2, unit: "margin" },
  });

  if (highPressure.length) {
    const atRiskValue = sum(highPressure, (row) => row.Revenue);
    recommendations.push({
      id: "inventory-pressure", title: "Resolve inventory pressure on priority lines",
      explanation: `${highPressure.length} current-period transaction lines have inventory pressure above 70/100. Addressing these early protects availability and avoids avoidable revenue loss.`,
      metrics: [{ label: "High-pressure lines", value: String(highPressure.length) }, { label: "Revenue exposed", value: money(atRiskValue) }],
      impact: `Revenue protected: ${money(atRiskValue * 0.05)}`, confidence: 84, priority: highPressure.length / Math.max(current.length, 1) > 0.2 ? "High" : "Medium",
      details: ["Review the highest-pressure SKU and warehouse combinations first.", "Coordinate replenishment, redistribution, or a controlled demand throttle."],
      simulation: { lever: "inventory intervention", entity: "High-pressure lines", baseline: atRiskValue, projectedChange: 5, unit: "revenue" },
    });
  }

  const rank = { High: 0, Medium: 1, Low: 2 };
  return recommendations.sort((a, b) => rank[a.priority] - rank[b.priority] || b.confidence - a.confidence).slice(0, 5);
}
