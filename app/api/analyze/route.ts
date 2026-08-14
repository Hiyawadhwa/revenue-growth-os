import { NextRequest, NextResponse } from "next/server";
import { parseRawWorkbook } from "@/lib/masterDb";
import { applyFilters, generateAnalysis } from "@/lib/analysis";
import { buildMasterDb } from "@/lib/masterDb";
import { Filters, MasterRow } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_FILTERS: Filters = {
  region: "All",
  channel: "All",
  category: "All",
  vendor: "All",
  period: "All time",
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  let masterRows: MasterRow[];
  let filters: Filters = DEFAULT_FILTERS;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const filtersRaw = form.get("filters") as string | null;
    if (filtersRaw) filters = { ...DEFAULT_FILTERS, ...JSON.parse(filtersRaw) };
    if (!file) return NextResponse.json({ error: "No Master DB uploaded" }, { status: 400 });
    const buffer = await file.arrayBuffer();
    const { rows } = parseRawWorkbook(buffer);
    // If the uploaded sheet already has derived columns, treat as-is; otherwise derive them.
    masterRows = rows.length && "CLV" in (rows[0] as any) ? (rows as unknown as MasterRow[]) : buildMasterDb(rows);
  } else {
    const body = await req.json();
    masterRows = body.rows as MasterRow[];
    filters = { ...DEFAULT_FILTERS, ...(body.filters ?? {}) };
  }

  const filtered = applyFilters(masterRows, filters);
  const analysis = generateAnalysis(filtered.length ? filtered : masterRows);

  return NextResponse.json({
    filters,
    rowCount: filtered.length,
    totalRows: masterRows.length,
    analysis,
  });
}
