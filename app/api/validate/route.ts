import { NextRequest, NextResponse } from "next/server";
import { readMappedSheet } from "@/lib/masterDb";
import { validateRows } from "@/lib/validation";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
const MAX_STORED_EXCEPTIONS = 5000;

export async function POST(req: NextRequest) {
  const file = (await req.formData()).get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const rows = readMappedSheet(await file.arrayBuffer());
  if (rows.length === 0) {
    return NextResponse.json({ error: "Could not read any rows from this file." }, { status: 422 });
  }

  const report = validateRows(rows);
  const db = getDb();
  if (!db) {
    const local = report.exceptions.map((e, i) => ({
      id: i + 1, ruleId: e.ruleId, ruleName: e.ruleName, severity: e.severity, rowNumber: e.rowNumber,
      record: e.record, message: e.message, status: "Open", notes: "", detectedAt: new Date().toISOString(),
    }));
    return NextResponse.json({ report: { ...report, exceptions: [] }, uploadId: null, exceptions: local, persisted: false });
  }

  const upload = await db.dataUpload.create({
    data: {
      fileName: file.name,
      totalRecords: report.totalRecords,
      validRecords: report.validRecords,
      invalidRecords: report.invalidRecords,
      duplicateCount: report.duplicateRecords,
      qualityPct: report.qualityPct,
      results: {
        create: report.rules.map((r) => ({
          ruleId: r.id, ruleName: r.name, category: r.category, level: r.level, status: r.status, affected: r.affected,
        })),
      },
    },
  });

  const stored = report.exceptions.slice(0, MAX_STORED_EXCEPTIONS);
  await db.exception.createMany({
    data: stored.map((e) => ({
      uploadId: upload.id, ruleId: e.ruleId, ruleName: e.ruleName, severity: e.severity,
      rowNumber: e.rowNumber, record: e.record, message: e.message,
    })),
  });
  await db.auditLog.createMany({
    data: [
      { action: "Dataset uploaded", detail: `${file.name} (${report.totalRecords} records)`, uploadId: upload.id },
      { action: "Validation completed", detail: `${report.exceptions.length} exceptions detected, quality ${report.qualityPct}%`, uploadId: upload.id },
    ],
  });

  // Re-read with DB ids so the UI can resolve exceptions by id.
  const saved = await db.exception.findMany({ where: { uploadId: upload.id }, orderBy: { id: "asc" } });
  return NextResponse.json({ report: { ...report, exceptions: [] }, uploadId: upload.id, exceptions: saved, persisted: true });
}
