import { RawRow } from "./types";

// Deterministic PRNG so the "sample data" is identical on every load/server render.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = ["Tea", "Coffee", "Snacks", "Personal Care", "Home Care", "Beverages"];
const REGIONS = ["North", "South", "East", "West", "Central"];
const CHANNELS = ["Q-Comm", "Retail", "Modern Trade", "General Trade", "E-commerce"];
const VENDORS = ["Vendor Alpha", "Vendor Bravo", "Vendor Cresta", "Vendor Delta", "Vendor Estel"];
const WAREHOUSES = ["WH-North-1", "WH-South-1", "WH-East-1", "WH-West-1", "WH-Central-1"];

const PRODUCTS: { name: string; category: string; basePrice: number }[] = [
  { name: "Bru Gold 100g", category: "Coffee", basePrice: 245 },
  { name: "Bru Instant 50g", category: "Coffee", basePrice: 130 },
  { name: "Nescafe Classic 200g", category: "Coffee", basePrice: 410 },
  { name: "Filter Roast 250g", category: "Coffee", basePrice: 360 },
  { name: "Tea Gold 500g", category: "Tea", basePrice: 275 },
  { name: "Green Tea 100g", category: "Tea", basePrice: 190 },
  { name: "Masala Chai 250g", category: "Tea", basePrice: 150 },
  { name: "Herbal Infusion 25b", category: "Tea", basePrice: 210 },
  { name: "Potato Chips 90g", category: "Snacks", basePrice: 40 },
  { name: "Trail Mix 150g", category: "Snacks", basePrice: 120 },
  { name: "Namkeen Mix 200g", category: "Snacks", basePrice: 95 },
  { name: "Protein Bar 45g", category: "Snacks", basePrice: 60 },
  { name: "Shampoo 340ml", category: "Personal Care", basePrice: 220 },
  { name: "Body Wash 250ml", category: "Personal Care", basePrice: 185 },
  { name: "Toothpaste 150g", category: "Personal Care", basePrice: 95 },
  { name: "Dish Wash 500ml", category: "Home Care", basePrice: 110 },
  { name: "Floor Cleaner 1L", category: "Home Care", basePrice: 160 },
  { name: "Detergent 1kg", category: "Home Care", basePrice: 210 },
  { name: "Cola 750ml", category: "Beverages", basePrice: 45 },
  { name: "Fruit Juice 1L", category: "Beverages", basePrice: 130 },
];

const START = new Date("2024-01-01");
const END = new Date("2025-12-31");
const DAY = 86400000;

function fmtDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export const SAMPLE_META = {
  rows: 4500,
  skus: PRODUCTS.length,
  categories: CATEGORIES.length,
  regions: REGIONS.length,
  range: "Jan 2024 \u2013 Dec 2025",
};

export function generateSampleData(count = 4500): RawRow[] {
  const rand = mulberry32(20260807);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const rows: RawRow[] = [];
  const totalDays = Math.floor((END.getTime() - START.getTime()) / DAY);

  for (let i = 0; i < count; i++) {
    const product = pick(PRODUCTS);
    const region = pick(REGIONS);
    const channel = pick(CHANNELS);
    const vendor = pick(VENDORS);
    const warehouse = WAREHOUSES[REGIONS.indexOf(region)];
    const date = new Date(START.getTime() + Math.floor(rand() * totalDays) * DAY);
    // seasonal + growth drift so YoY / trend views have signal
    const monthIdx = date.getMonth();
    const yearBoost = date.getFullYear() === 2025 ? 1.18 : 1;
    const seasonal = 1 + 0.25 * Math.sin((monthIdx / 12) * Math.PI * 2);
    const units = Math.max(1, Math.round((rand() * 18 + 2) * seasonal * yearBoost));
    const discount = [0, 0, 0, 0.05, 0.1, 0.15, 0.2][Math.floor(rand() * 7)];
    const price = product.basePrice * (1 - discount);
    const revenue = Math.round(units * price * 100) / 100;
    const inventoryLevel = Math.round(rand() * 500 + 20);
    const shippingDays = Math.round(rand() * 6 + 1);
    const expiry = new Date(date.getTime() + (Math.round(rand() * 300) + 30) * DAY);
    const nps = Math.round(rand() * 10);
    const customerId = `CUST-${String(Math.floor(rand() * 900) + 100)}`;

    rows.push({
      Date: fmtDate(date),
      Product: product.name,
      Category: product.category,
      Region: region,
      Channel: channel,
      CustomerID: customerId,
      UnitsSold: units,
      BasePrice: product.basePrice,
      Discount: discount,
      Revenue: revenue,
      InventoryLevel: inventoryLevel,
      Vendor: vendor,
      Warehouse: warehouse,
      ShippingDays: shippingDays,
      ExpiryDate: fmtDate(expiry),
      NPS: nps,
    });
  }
  return rows.sort((a, b) => (a.Date < b.Date ? -1 : 1));
}
