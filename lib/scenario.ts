import { applyFilters } from "./analysis";
import { Filters, MasterRow } from "./types";

export type ScenarioInputs = { priceChange: number; discountChange: number; marketingChange: number; inventoryChange: number; region: string; category: string; channel: string };
export type ScenarioMetric = { label: string; baseline: number; scenario: number; format: "money" | "percent" | "number"; higherIsBetter?: boolean };
export type ScenarioResult = { metrics: ScenarioMetric[]; confidence: number; summary: string; tradeoffs: string[]; risks: string[] };

const sum = (rows: MasterRow[], fn: (r: MasterRow) => number) => rows.reduce((n, row) => n + fn(row), 0);

export const BASELINE_SCENARIO: ScenarioInputs = { priceChange: 0, discountChange: 0, marketingChange: 0, inventoryChange: 0, region: "All", category: "All", channel: "All" };

export function simulateScenario(rows: MasterRow[], filters: Filters, inputs: ScenarioInputs): ScenarioResult {
  const scopedFilters: Filters = { ...filters, region: inputs.region === "All" ? filters.region : inputs.region, category: inputs.category === "All" ? filters.category : inputs.category, channel: inputs.channel === "All" ? filters.channel : inputs.channel };
  const data = applyFilters(rows, scopedFilters); const active = data.length ? data : rows;
  const current = active.filter((row) => row.Period === 2); const prior = active.filter((row) => row.Period === 1);
  const revenue = sum(current, (row) => row.Revenue); const previousRevenue = sum(prior, (row) => row.Revenue);
  const units = sum(current, (row) => row.UnitsSold); const baseMargin = sum(current, (row) => row.ProfitPct) / Math.max(1, current.length);
  const baseProfit = revenue * (baseMargin / 100); const avgInventory = sum(current, (row) => row.InventoryLevel) / Math.max(1, current.length);
  const baseRoi = sum(current, (row) => row.ROAS) / Math.max(1, current.length);
  // Price elasticity and operating levers are intentionally transparent local assumptions until an AI/model API replaces them.
  const demandFactor = Math.max(0.55, 1 - inputs.priceChange * 0.45 + inputs.discountChange * 0.32 + inputs.marketingChange * 0.18 + inputs.inventoryChange * 0.08);
  const priceFactor = 1 + inputs.priceChange / 100 - inputs.discountChange / 100;
  const scenarioUnits = units * demandFactor; const scenarioRevenue = revenue * priceFactor * demandFactor;
  const scenarioMargin = Math.max(1, baseMargin + inputs.priceChange * 0.38 - inputs.discountChange * 0.45 - inputs.marketingChange * 0.05);
  const scenarioProfit = scenarioRevenue * (scenarioMargin / 100) - revenue * Math.max(0, inputs.marketingChange) / 100 * 0.07;
  const scenarioRoi = Math.max(0.1, baseRoi * (1 + inputs.priceChange * 0.035 - inputs.marketingChange * 0.025 + inputs.discountChange * 0.012));
  const scenarioInventory = Math.max(0, avgInventory * (1 + inputs.inventoryChange / 100) - (scenarioUnits - units) * 0.04);
  const baseGrowth = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
  const scenarioGrowth = previousRevenue ? ((scenarioRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const positive = scenarioProfit >= baseProfit;
  const changes = [inputs.priceChange, inputs.discountChange, inputs.marketingChange, inputs.inventoryChange].filter(Boolean).length;
  const metrics: ScenarioMetric[] = [
    { label: "Revenue", baseline: revenue, scenario: scenarioRevenue, format: "money" }, { label: "Revenue Growth", baseline: baseGrowth, scenario: scenarioGrowth, format: "percent" },
    { label: "Profit", baseline: baseProfit, scenario: scenarioProfit, format: "money" }, { label: "Margin", baseline: baseMargin, scenario: scenarioMargin, format: "percent" },
    { label: "Units Sold / Demand", baseline: units, scenario: scenarioUnits, format: "number" }, { label: "ROI", baseline: baseRoi, scenario: scenarioRoi, format: "number" },
    { label: "Inventory impact", baseline: avgInventory, scenario: scenarioInventory, format: "number", higherIsBetter: false },
  ];
  const summary = `This scenario ${positive ? "improves" : "reduces"} projected profit by ${Math.abs(((scenarioProfit - baseProfit) / Math.max(baseProfit, 1)) * 100).toFixed(1)}% versus baseline. ${inputs.priceChange ? `A ${inputs.priceChange > 0 ? "higher" : "lower"} price is the primary demand trade-off.` : "The result is driven by the selected operating levers."}`;
  return { metrics, confidence: Math.max(62, 91 - changes * 5 - Math.abs(inputs.priceChange) * 1.2 - Math.abs(inputs.discountChange) * 0.7), summary, tradeoffs: [scenarioUnits < units ? "Demand is projected to soften; watch conversion and repeat purchase." : "Demand is projected to improve, but validate the cost to acquire it.", scenarioMargin < baseMargin ? "Margin pressure rises under the discount and spend assumptions." : "Margin expands under the modeled price and mix assumptions."], risks: [Math.abs(inputs.priceChange) >= 8 ? "Price change is large enough to require a controlled test." : "Use a limited region or channel test before scaling.", scenarioInventory < avgInventory * 0.8 ? "Inventory cover may tighten if demand materializes faster than planned." : "Monitor actual sell-through against the projected response."] };
}
