import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
const STATUSES = ["Open", "Under Review", "Resolved"];

export async function PATCH(req: NextRequest) {
  const { id, status, notes } = (await req.json()) as { id: number; status: string; notes?: string };
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const db = getDb();
  if (!db) return NextResponse.json({ persisted: false });

  const updated = await db.exception.update({
    where: { id },
    data: { status, notes: notes ?? "", resolvedAt: status === "Resolved" ? new Date() : null },
  });
  await db.auditLog.create({
    data: {
      action: `Exception marked ${status.toLowerCase()}`,
      detail: `EXC-${String(id).padStart(4, "0")} (${updated.ruleName})`,
      uploadId: updated.uploadId,
    },
  });
  return NextResponse.json({ persisted: true, exception: updated });
}
