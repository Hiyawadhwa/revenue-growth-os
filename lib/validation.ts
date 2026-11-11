// Rule-based validation engine. Runs on the *un-backfilled* mapped rows from
// readMappedSheet(), so missing values are still visible.

export type RuleLevel = "error" | "warning";
export type Severity = "High" | "Medium" | "Low";
export type RuleCategory = "Missing" | "Duplicate" | "Invalid value" | "Format" | "Consistency";
export type RuleStatus = "passed" | "failed" | "warning" | "skipped";

export interface RuleDef {
  id: string;
  name: string;
  category: RuleCategory;
  level: RuleLevel;
  severity: Severity;
}

export interface RuleResult extends RuleDef {
  status: RuleStatus;
  affected: number;
  note?: string;
}

export interface ValidationException {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  level: RuleLevel;
  rowNumber: number; // spreadsheet row (header = row 1)
  record: string; // TransactionID if present, else "Row N"
  message: string;
}

export interface ValidationReport {
  totalRecords: number;
  validRecords: number; // no error-level violation (warnings still count as valid)
  invalidRecords: number; // at least one error-level violation
  warningRecords: number; // warnings only
  duplicateRecords: number;
  qualityPct: number;
  hasTransactionId: boolean;
  rules: RuleResult[];
  failuresByCategory: { category: RuleCategory; count: number }[];
  exceptions: ValidationException[];
}

export const RULES: RuleDef[] = [
  { id: "R01", name: "Transaction ID must be unique", category: "Duplicate", level: "error", severity: "High" },
  { id: "R02", name: "No repeated records (same date, product, customer, units, revenue)", category: "Duplicate", level: "warning", severity: "Medium" },
  { id: "R03", name: "Customer ID cannot be missing", category: "Missing", level: "error", severity: "Medium" },
  { id: "R04", name: "Product cannot be missing", category: "Missing", level: "error", severity: "Medium" },
  { id: "R05", name: "Sales amount must be a positive number", category: "Invalid value", level: "error", severity: "High" },
  { id: "R06", name: "Units sold must be a positive number", category: "Invalid value", level: "error", severity: "High" },
  { id: "R07", name: "Base price must be a positive number", category: "Invalid value", level: "error", severity: "High" },
  { id: "R08", name: "Discount must be between 0 and 1", category: "Invalid value", level: "error", severity: "Medium" },
  { id: "R09", name: "Date must be present and valid", category: "Format", level: "error", severity: "Medium" },
  { id: "R10", name: "Date format must be consistent across the file", category: "Format", level: "warning", severity: "Low" },
  { id: "R11", name: "Revenue should equal units x price x (1 - discount)", category: "Consistency", level: "warning", severity: "Medium" },
  { id: "R12", name: "Expiry date must be after transaction date", category: "Consistency", level: "warning", severity: "Low" },
  { id: "R13", name: "NPS must be between 0 and 10", category: "Invalid value", level: "warning", severity: "Low" },
];

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
const num = (v: unknown) => (isBlank(v) ? NaN : Number(v));

function dateClass(v: unknown): string {
  if (typeof v === "number") return "excel-serial";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return "iso";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return "slash";
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) return "dash";
  return "other";
}

function toTime(v: unknown): number {
  if (typeof v === "number") return Math.round((v - 25569) * 86400000); // Excel serial -> epoch ms
  return new Date(String(v)).getTime();
}

export function validateRows(rows: Record<string, any>[]): ValidationReport {
  const total = rows.length;
  const hasTransactionId = rows.some((r) => !isBlank(r.TransactionID));
  const exceptions: ValidationException[] = [];
  const hits = new Map<string, Set<number>>();
  const def = new Map(RULES.map((r) => [r.id, r]));

  const flag = (ruleId: string, idx: number, message: string) => {
    const d = def.get(ruleId)!;
    if (!hits.has(ruleId)) hits.set(ruleId, new Set());
    hits.get(ruleId)!.add(idx);
    const rec = hasTransactionId && !isBlank(rows[idx].TransactionID) ? String(rows[idx].TransactionID) : `Row ${idx + 2}`;
    exceptions.push({
      ruleId,
      ruleName: d.name,
      severity: d.severity,
      level: d.level,
      rowNumber: idx + 2,
      record: rec,
      message,
    });
  };

  // R01 / R02: duplicates
  if (hasTransactionId) {
    const first = new Map<string, number>();
    rows.forEach((r, i) => {
      if (isBlank(r.TransactionID)) return;
      const k = String(r.TransactionID).trim();
      if (first.has(k)) flag("R01", i, `Duplicate transaction ID ${k} (first seen on row ${first.get(k)! + 2})`);
      else first.set(k, i);
    });
  } else {
    const seen = new Map<string, number>();
    rows.forEach((r, i) => {
      const k = [r.Date, r.Product, r.CustomerID, r.UnitsSold, r.Revenue].join("|");
      if (seen.has(k)) flag("R02", i, `Same as row ${seen.get(k)! + 2}`);
      else seen.set(k, i);
    });
  }

  // Dominant date format, for R10
  const classCount = new Map<string, number>();
  rows.forEach((r) => {
    if (!isBlank(r.Date)) classCount.set(dateClass(r.Date), (classCount.get(dateClass(r.Date)) || 0) + 1);
  });
  const dominant = [...classCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  rows.forEach((r, i) => {
    if (isBlank(r.CustomerID)) flag("R03", i, "Customer ID is missing");
    if (isBlank(r.Product)) flag("R04", i, "Product is missing");

    const rev = num(r.Revenue);
    if (isBlank(r.Revenue)) flag("R05", i, "Sales amount is missing");
    else if (isNaN(rev) || rev <= 0) flag("R05", i, `Sales amount is ${r.Revenue}`);

    const units = num(r.UnitsSold);
    if (isBlank(r.UnitsSold)) flag("R06", i, "Units sold is missing");
    else if (isNaN(units) || units <= 0) flag("R06", i, `Units sold is ${r.UnitsSold}`);

    const price = num(r.BasePrice);
    if (isBlank(r.BasePrice)) flag("R07", i, "Base price is missing");
    else if (isNaN(price) || price <= 0) flag("R07", i, `Base price is ${r.BasePrice}`);

    if (!isBlank(r.Discount)) {
      const d = num(r.Discount);
      if (isNaN(d) || d < 0 || d > 1) flag("R08", i, `Discount is ${r.Discount}`);
    }

    let dateOk = false;
    if (isBlank(r.Date)) flag("R09", i, "Date is missing");
    else if (isNaN(toTime(r.Date))) flag("R09", i, `Unreadable date "${r.Date}"`);
    else dateOk = true;

    if (dateOk && dominant && dateClass(r.Date) !== dominant) {
      flag("R10", i, `Date "${r.Date}" is ${dateClass(r.Date)} format; most rows use ${dominant}`);
    }

    if (!isNaN(rev) && !isNaN(units) && !isNaN(price) && rev > 0 && units > 0 && price > 0) {
      const d = isBlank(r.Discount) || isNaN(num(r.Discount)) ? 0 : num(r.Discount);
      const expected = units * price * (1 - d);
      if (expected > 0 && Math.abs(rev - expected) / expected > 0.01) {
        flag("R11", i, `Revenue ${rev} vs expected ${expected.toFixed(2)}`);
      }
    }

    if (dateOk && !isBlank(r.ExpiryDate)) {
      const exp = toTime(r.ExpiryDate);
      if (!isNaN(exp) && exp <= toTime(r.Date)) flag("R12", i, "Expiry date is not after the transaction date");
    }

    if (!isBlank(r.NPS)) {
      const n = num(r.NPS);
      if (isNaN(n) || n < 0 || n > 10) flag("R13", i, `NPS is ${r.NPS}`);
    }
  });

  const rules: RuleResult[] = RULES.map((d) => {
    const affected = hits.get(d.id)?.size ?? 0;
    const skipped = (d.id === "R01" && !hasTransactionId) || (d.id === "R02" && hasTransactionId);
    const status: RuleStatus = skipped ? "skipped" : affected === 0 ? "passed" : d.level === "error" ? "failed" : "warning";
    const note = skipped
      ? d.id === "R01"
        ? "No transaction ID column found"
        : "Not needed, transaction IDs are present"
      : undefined;
    return { ...d, status, affected, note };
  });

  const errorRows = new Set<number>();
  const warnRows = new Set<number>();
  const dupRows = new Set<number>([...(hits.get("R01") ?? []), ...(hits.get("R02") ?? [])]);
  for (const d of RULES) {
    for (const i of hits.get(d.id) ?? []) (d.level === "error" ? errorRows : warnRows).add(i);
  }
  const invalid = errorRows.size;
  const warningOnly = [...warnRows].filter((i) => !errorRows.has(i)).length;

  const catCount = new Map<RuleCategory, number>();
  for (const r of rules) if (r.affected > 0) catCount.set(r.category, (catCount.get(r.category) || 0) + r.affected);

  return {
    totalRecords: total,
    validRecords: total - invalid,
    invalidRecords: invalid,
    warningRecords: warningOnly,
    duplicateRecords: dupRows.size,
    qualityPct: total ? Math.round(((total - invalid) / total) * 1000) / 10 : 0,
    hasTransactionId,
    rules,
    failuresByCategory: [...catCount.entries()].map(([category, count]) => ({ category, count })),
    exceptions,
  };
}
