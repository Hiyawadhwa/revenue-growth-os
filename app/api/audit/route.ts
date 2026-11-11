import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ enabled: false, entries: [] });
  const entries = await db.auditLog.findMany({ orderBy: { id: "desc" }, take: 100 });
  return NextResponse.json({ enabled: true, entries });
}
