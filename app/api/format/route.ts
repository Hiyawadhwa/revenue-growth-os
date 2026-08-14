import { NextRequest, NextResponse } from "next/server";
import { buildMasterDb, exportMasterWorkbook, parseRawWorkbook } from "@/lib/masterDb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const { rows, flagged } = parseRawWorkbook(buffer);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Could not read any rows. Check the required columns are present." },
      { status: 422 }
    );
  }

  const masterRows = buildMasterDb(rows);
  const wbBytes = exportMasterWorkbook(masterRows);

  return new NextResponse(Buffer.from(wbBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Master_DB.xlsx"',
      "X-Rows-Parsed": String(rows.length),
      "X-Rows-Backfilled": String(flagged),
    },
  });
}
