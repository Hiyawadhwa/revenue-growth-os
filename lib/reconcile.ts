import * as XLSX from "xlsx";

export interface IdAmount {
  id: string;
  amount: number;
}

export interface ReconDiff {
  id: string;
  type: "Only in A" | "Only in B" | "Amount mismatch";
  amountA: number | null;
  amountB: number | null;
  difference: number;
}

export interface ReconResult {
  recordsA: number;
  recordsB: number;
  matched: number; // IDs present in both sources
  onlyInA: number;
  onlyInB: number;
  amountMismatches: number;
  duplicatesA: number;
  duplicatesB: number;
  totalA: number;
  totalB: number;
  discrepancy: number; // totalA - totalB
  diffs: ReconDiff[]; // capped sample, largest first
}

const ID_HEADERS = ["transaction id", "transactionid", "order id", "orderid", "txn id", "invoice no", "invoice number", "settlement id", "reference"];
const AMOUNT_HEADERS = ["revenue", "amount", "sales", "net sales", "settlement amount", "total", "sales amount"];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Read the ID and amount columns of an arbitrary sales / settlement file. */
export function parseIdAmount(buffer: ArrayBuffer): IdAmount[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames.find((n) => /master ?db/i.test(n)) || wb.SheetNames[0]];
  const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!json.length) return [];
  const headers = Object.keys(json[0]);
  const idCol = headers.find((h) => ID_HEADERS.includes(norm(h)));
  const amtCol = headers.find((h) => AMOUNT_HEADERS.includes(norm(h)));
  if (!idCol || !amtCol) throw new Error("Each file needs a transaction/order ID column and an amount column.");
  return json
    .filter((r) => String(r[idCol]).trim() !== "")
    .map((r) => ({ id: String(r[idCol]).trim(), amount: Number(r[amtCol]) || 0 }));
}

function group(rows: IdAmount[]) {
  const map = new Map<string, number>();
  let dupes = 0;
  for (const r of rows) {
    if (map.has(r.id)) dupes++;
    map.set(r.id, (map.get(r.id) || 0) + r.amount); // duplicate IDs are summed, so they surface as mismatches
  }
  return { map, dupes };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function reconcile(a: IdAmount[], b: IdAmount[], tolerance = 0.01): ReconResult {
  const A = group(a);
  const B = group(b);
  const diffs: ReconDiff[] = [];
  let matched = 0;
  let mismatches = 0;
  let onlyA = 0;
  let onlyB = 0;

  for (const [id, amtA] of A.map) {
    const amtB = B.map.get(id);
    if (amtB === undefined) {
      onlyA++;
      diffs.push({ id, type: "Only in A", amountA: round2(amtA), amountB: null, difference: round2(amtA) });
    } else {
      matched++;
      if (Math.abs(amtA - amtB) > tolerance) {
        mismatches++;
        diffs.push({ id, type: "Amount mismatch", amountA: round2(amtA), amountB: round2(amtB), difference: round2(amtA - amtB) });
      }
    }
  }
  for (const [id, amtB] of B.map) {
    if (!A.map.has(id)) {
      onlyB++;
      diffs.push({ id, type: "Only in B", amountA: null, amountB: round2(amtB), difference: round2(-amtB) });
    }
  }

  const totalA = a.reduce((s, r) => s + r.amount, 0);
  const totalB = b.reduce((s, r) => s + r.amount, 0);
  diffs.sort((x, y) => Math.abs(y.difference) - Math.abs(x.difference));

  return {
    recordsA: a.length,
    recordsB: b.length,
    matched,
    onlyInA: onlyA,
    onlyInB: onlyB,
    amountMismatches: mismatches,
    duplicatesA: A.dupes,
    duplicatesB: B.dupes,
    totalA: round2(totalA),
    totalB: round2(totalB),
    discrepancy: round2(totalA - totalB),
    diffs: diffs.slice(0, 200),
  };
}
