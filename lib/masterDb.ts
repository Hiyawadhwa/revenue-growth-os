import * as XLSX from "xlsx";
import { MasterRow, RawRow } from "./types";

// Fuzzy header aliases -> canonical RawRow field, used when auto-mapping an
// arbitrary raw Sales / SAP / POS export.
const HEADER_ALIASES: Record<keyof RawRow, string[]> = {
  Date: ["date", "txn date", "order date", "transaction date"],
  Product: ["product", "sku", "product / sku", "item", "item name"],
  Category: ["category", "product category"],
  Region: ["region", "zone"],
  Channel: ["channel", "sales channel"],
  CustomerID: ["customer id", "customerid", "customer"],
  UnitsSold: ["units sold", "units", "qty", "quantity"],
  BasePrice: ["base price", "price", "mrp", "unit price"],
  Discount: ["discount", "discount %", "discount pct"],
  Revenue: ["revenue", "sales", "net sales", "amount"],
  InventoryLevel: ["inventory level", "inventory", "stock", "stock on hand"],
  Vendor: ["vendor", "supplier"],
  Warehouse: ["warehouse", "dc", "distribution center"],
  ShippingDays: ["shipping days", "lead time", "transit days"],
  ExpiryDate: ["expiry date", "expiry", "best before"],
  NPS: ["nps", "net promoter score", "csat"],
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function backfillDate(raw: string | number | undefined): string {
  if (!raw) return "01/01/2024";
  if (typeof raw === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    return `${String(d.m).padStart(2, "0")}/${String(d.d).padStart(2, "0")}/${d.y}`;
  }
  const s = String(raw).trim();
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(
      parsed.getDate()
    ).padStart(2, "0")}/${parsed.getFullYear()}`;
  }
  return s;
}

/** Parse an arbitrary raw export (xlsx/xls/csv) into normalized RawRow[]. */
export function parseRawWorkbook(buffer: ArrayBuffer): { rows: RawRow[]; flagged: number } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName =
    wb.SheetNames.find((n) => /master ?db/i.test(n)) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const headerMap = new Map<string, keyof RawRow>();
  if (json.length) {
    const headers = Object.keys(json[0]);
    for (const h of headers) {
      const nh = normalize(h);
      for (const key of Object.keys(HEADER_ALIASES) as (keyof RawRow)[]) {
        if (nh === normalize(key) || HEADER_ALIASES[key].some((a) => normalize(a) === nh)) {
          headerMap.set(h, key);
        }
      }
    }
  }

  let flagged = 0;
  const rows: RawRow[] = json.map((r) => {
    const out: any = {};
    for (const [rawHeader, key] of headerMap.entries()) {
      out[key] = r[rawHeader];
    }
    if (!out.Date) flagged++;
    out.Date = backfillDate(out.Date);
    out.ExpiryDate = out.ExpiryDate ? backfillDate(out.ExpiryDate) : "";
    out.Product = out.Product || "Unmapped SKU";
    out.Category = out.Category || "Uncategorized";
    out.Region = out.Region || "Unassigned";
    out.Channel = out.Channel || "Unassigned";
    out.CustomerID = out.CustomerID || "UNKNOWN";
    out.Vendor = out.Vendor || "Unassigned";
    out.Warehouse = out.Warehouse || "Unassigned";
    out.UnitsSold = Number(out.UnitsSold) || 0;
    out.BasePrice = Number(out.BasePrice) || 0;
    out.Discount = Number(out.Discount) || 0;
    out.Revenue = Number(out.Revenue) || out.UnitsSold * out.BasePrice * (1 - out.Discount);
    out.InventoryLevel = Number(out.InventoryLevel) || 0;
    out.ShippingDays = Number(out.ShippingDays) || 0;
    out.NPS = Number(out.NPS) || 7;
    return out as RawRow;
  });

  return { rows, flagged };
}

function daysBetween(a: string, b: string) {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 999;
  return Math.round((db - da) / 86400000);
}

const CHANNEL_SPEND_RATE: Record<string, number> = {
  "Q-Comm": 0.12,
  Retail: 0.05,
  "Modern Trade": 0.06,
  "General Trade": 0.03,
  "E-commerce": 0.1,
};

/** Turn raw rows into the analysis-ready Master DB, computing every derived metric. */
export function buildMasterDb(rawRows: RawRow[]): MasterRow[] {
  if (rawRows.length === 0) return [];

  const sorted = [...rawRows].sort(
    (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
  );
  const midpoint = Math.floor(sorted.length / 2);
  const splitDate = new Date(sorted[midpoint].Date).getTime();

  // Pass 1: vendor revenue per category, for VendorDependency
  const categoryVendorRevenue = new Map<string, number>();
  const categoryRevenue = new Map<string, number>();
  for (const r of rawRows) {
    const key = `${r.Category}::${r.Vendor}`;
    categoryVendorRevenue.set(key, (categoryVendorRevenue.get(key) || 0) + r.Revenue);
    categoryRevenue.set(r.Category, (categoryRevenue.get(r.Category) || 0) + r.Revenue);
  }

  // Customer order counts, for CLV
  const customerOrders = new Map<string, number>();
  const customerRevenue = new Map<string, number>();
  for (const r of rawRows) {
    customerOrders.set(r.CustomerID, (customerOrders.get(r.CustomerID) || 0) + 1);
    customerRevenue.set(r.CustomerID, (customerRevenue.get(r.CustomerID) || 0) + r.Revenue);
  }

  return rawRows.map((r) => {
    const rowTime = new Date(r.Date).getTime();
    const period: 1 | 2 = !isNaN(rowTime) && rowTime <= splitDate ? 1 : 2;

    const costPerUnit = r.BasePrice * 0.55;
    const profitPct =
      r.Revenue > 0 ? ((r.Revenue - costPerUnit * r.UnitsSold) / r.Revenue) * 100 : 0;

    const spendRate = CHANNEL_SPEND_RATE[r.Channel] ?? 0.06;
    const marketingSpend = r.Revenue * spendRate;
    const roas = marketingSpend > 0 ? r.Revenue / marketingSpend : 0;
    const newCustomerEstimate = Math.max(1, Math.round(r.UnitsSold * 0.15));
    const cac = marketingSpend / newCustomerEstimate;

    const orders = customerOrders.get(r.CustomerID) || 1;
    const custRevenue = customerRevenue.get(r.CustomerID) || r.Revenue;
    const clv = (custRevenue / orders) * Math.min(orders, 12) * (profitPct / 100 || 0.3);

    const velocity = r.InventoryLevel > 0 ? r.UnitsSold / r.InventoryLevel : 1;
    const inventoryPressure = Math.max(0, Math.min(100, Math.round(velocity * 500)));

    const daysToExpiry = r.ExpiryDate ? daysBetween(r.Date, r.ExpiryDate) : 999;
    const expiryRisk: MasterRow["ExpiryRisk"] =
      daysToExpiry < 30 ? "High" : daysToExpiry < 90 ? "Medium" : "Low";

    const churnRisk: MasterRow["ChurnRisk"] =
      r.NPS <= 6 ? "High" : r.NPS <= 8 ? "Medium" : "Low";

    const vKey = `${r.Category}::${r.Vendor}`;
    const catTotal = categoryRevenue.get(r.Category) || 1;
    const vendorDependency = Math.round(((categoryVendorRevenue.get(vKey) || 0) / catTotal) * 1000) / 10;

    return {
      ...r,
      Period: period,
      CLV: Math.round(clv * 100) / 100,
      AOV: Math.round(r.Revenue * 100) / 100,
      ProfitPct: Math.round(profitPct * 10) / 10,
      ROAS: Math.round(roas * 100) / 100,
      CAC: Math.round(cac * 100) / 100,
      InventoryPressure: inventoryPressure,
      ExpiryRisk: expiryRisk,
      ChurnRisk: churnRisk,
      VendorDependency: vendorDependency,
    };
  });
}

/** Serialize a Master DB to an .xlsx buffer, in the `Master DB` sheet the app expects on re-upload. */
export function exportMasterWorkbook(rows: MasterRow[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Master DB");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
