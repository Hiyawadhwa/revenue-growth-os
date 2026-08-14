import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { ViewResult } from "@/lib/analysis";
import { VIEW_META, ViewId } from "@/lib/types";

export const runtime = "nodejs";

const ACCENT = "7C6CF6";
const INK = "12141D";
const MUTED = "63667F";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const analysis: Record<ViewId, ViewResult> = body.analysis;
  if (!analysis) return NextResponse.json({ error: "No analysis payload" }, { status: 400 });

  const pres = new PptxGenJS();
  pres.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pres.layout = "WIDE";

  // Title slide
  const title = pres.addSlide();
  title.background = { color: INK };
  title.addText("Revenue Growth Operating System", {
    x: 0.6, y: 2.6, w: 12, h: 1, fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  title.addText("AI-Powered Revenue Intelligence \u2014 Board-Ready Summary", {
    x: 0.6, y: 3.5, w: 12, h: 0.6, fontSize: 18, color: ACCENT,
  });
  title.addText(new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }), {
    x: 0.6, y: 6.6, w: 6, h: 0.4, fontSize: 12, color: MUTED,
  });

  for (const id of Object.keys(analysis) as ViewId[]) {
    const view = analysis[id];
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addText(VIEW_META[id].label, { x: 0.5, y: 0.35, w: 10, h: 0.6, fontSize: 26, bold: true, color: INK });
    slide.addText(VIEW_META[id].sub, { x: 0.5, y: 0.9, w: 10, h: 0.4, fontSize: 13, color: MUTED });

    // KPI row
    const kpiCount = view.kpis.length;
    const kpiW = 12.3 / kpiCount;
    view.kpis.forEach((k, i) => {
      const x = 0.5 + i * kpiW;
      slide.addShape(pres.ShapeType.roundRect, {
        x, y: 1.5, w: kpiW - 0.2, h: 1.1, fill: { color: "F4F3FB" }, line: { color: "E4E2F5" }, rectRadius: 0.08,
      });
      slide.addText(k.value, { x, y: 1.6, w: kpiW - 0.2, h: 0.55, fontSize: 18, bold: true, color: ACCENT, align: "center" });
      slide.addText(k.label, { x, y: 2.15, w: kpiW - 0.2, h: 0.4, fontSize: 10, color: MUTED, align: "center" });
    });

    // Chart
    if (view.chart.length) {
      const chartData = [
        {
          name: VIEW_META[id].label,
          labels: view.chart.map((c) => c.label),
          values: view.chart.map((c) => c.value),
        },
      ];
      const chartType =
        view.chartType === "pie" ? pres.ChartType.pie : view.chartType === "line" ? pres.ChartType.line : pres.ChartType.bar;
      slide.addChart(chartType, chartData, {
        x: 0.5, y: 2.9, w: 6.3, h: 3.7,
        chartColors: [ACCENT, "A99DFF", "33D69F", "F5B94F", "F45B69"],
        showLegend: view.chartType === "pie",
        showTitle: false,
        catAxisLabelColor: MUTED,
        valAxisLabelColor: MUTED,
      });
    }

    // Insights
    slide.addText(
      view.insights.map((t) => ({ text: t, options: { bullet: true, breakLine: true, color: INK, fontSize: 12 } })),
      { x: 7.1, y: 2.9, w: 5.7, h: 3.7 }
    );
  }

  const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": 'attachment; filename="Revenue_Growth_OS_Deck.pptx"',
    },
  });
}
