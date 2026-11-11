import { NextRequest, NextResponse } from "next/server";
import { parseIdAmount, reconcile } from "@/lib/reconcile";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const a = form.get("fileA") as File | null;
  const b = form.get("fileB") as File | null;
  if (!a || !b) return NextResponse.json({ error: "Upload both Source A and Source B." }, { status: 400 });

  try {
    const result = reconcile(parseIdAmount(await a.arrayBuffer()), parseIdAmount(await b.arrayBuffer()));
    const db = getDb();
    if (db) {
      await db.reconciliationRun.create({
        data: {
          sourceA: a.name, sourceB: b.name, recordsA: result.recordsA, recordsB: result.recordsB,
          matched: result.matched, unmatched: result.onlyInA + result.onlyInB, mismatches: result.amountMismatches,
          duplicates: result.duplicatesA + result.duplicatesB, discrepancy: result.discrepancy,
        },
      });
      await db.auditLog.create({
        data: {
          action: "Reconciliation run",
          detail: `${a.name} vs ${b.name}: ${result.matched} matched, ${result.onlyInA + result.onlyInB} unmatched, ${result.amountMismatches} amount mismatches`,
        },
      });
    }
    return NextResponse.json({ result, persisted: !!db });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Reconciliation failed" }, { status: 422 });
  }
}
