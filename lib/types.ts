export interface RawRow {
  Date: string; // MM/DD/YYYY
  Product: string;
  Category: string;
  Region: string;
  Channel: string;
  CustomerID: string;
  UnitsSold: number;
  BasePrice: number;
  Discount: number; // 0..1
  Revenue: number;
  InventoryLevel: number;
  Vendor: string;
  Warehouse: string;
  ShippingDays: number;
  ExpiryDate: string;
  NPS: number; // 0-10, used for churn/loyalty
}

export interface MasterRow extends RawRow {
  Period: 1 | 2; // 1 = prior period, 2 = current period
  CLV: number;
  AOV: number;
  ProfitPct: number;
  ROAS: number;
  CAC: number;
  InventoryPressure: number; // 0-100
  ExpiryRisk: "Low" | "Medium" | "High";
  ChurnRisk: "Low" | "Medium" | "High";
  VendorDependency: number; // % of category revenue from this vendor
}

export interface Filters {
  region: string;
  channel: string;
  category: string;
  vendor: string;
  period: "All time" | "Last 30 days" | "Last 90 days" | "Last 12 months" | "YTD";
}

export const VIEW_IDS = [
  "revenue",
  "sku",
  "marketing",
  "customer",
  "supply",
  "pricing",
  "shelf",
  "competition",
  "expansion",
] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export const VIEW_META: Record<ViewId, { label: string; sub: string; description: string }> = {
  revenue: { label: "Revenue Overview", sub: "Growth · region · channel", description: "See how revenue is performing across time, regions, and channels." },
  sku: { label: "Product Performance", sub: "Top sellers · slow movers", description: "Identify your strongest and weakest products." },
  marketing: { label: "Marketing Performance", sub: "ROAS · CAC · investment mix", description: "See which channels are creating the most efficient growth." },
  customer: { label: "Customer Health", sub: "Loyalty · value · retention", description: "Understand customer value, loyalty, and retention risk." },
  supply: { label: "Inventory & Supply", sub: "Stock · expiry · vendor risk", description: "Surface supply constraints before they affect sales." },
  pricing: { label: "Pricing", sub: "Discounts · margin · demand", description: "Understand how pricing and discounts affect growth." },
  shelf: { label: "Category Performance", sub: "Velocity · visibility", description: "Compare category demand and product visibility." },
  competition: { label: "Market Signals", sub: "Pricing · gaps · trends", description: "Track competitive signals and emerging market gaps." },
  expansion: { label: "Growth Opportunities", sub: "Whitespace · cross-sell", description: "Find the next regions, products, and customer opportunities to pursue." },
};
