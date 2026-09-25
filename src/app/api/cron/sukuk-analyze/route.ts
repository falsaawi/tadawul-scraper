import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMetricInputs } from "@/lib/sukuk-data";
import { computeBaseMetrics, fillRelativeMetrics } from "@/lib/sukuk-metrics";
import { analyzeUniverse } from "@/lib/sukuk-analyst";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Daily universe commentary over all sukuk. Cron-driven (0 15 * * SUN-THU),
// guarded by CRON_SECRET. Stores one scope='universe' SukukAnalysis row.
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const todayISO = new Date().toISOString().split("T")[0];
  const inputs = await buildMetricInputs();
  if (inputs.length === 0) {
    return NextResponse.json({ error: "No sukuk data yet" }, { status: 404 });
  }
  const all = fillRelativeMetrics(
    inputs.map((i) => computeBaseMetrics(i, todayISO))
  );

  try {
    const { analysis, model } = await analyzeUniverse(all);
    const saved = await prisma.sukukAnalysis.create({
      data: {
        scope: "universe",
        code: null,
        model,
        summary: analysis.commentary ?? null,
        metrics: JSON.stringify({ count: all.length, date: todayISO }),
        data: JSON.stringify(analysis),
      },
    });
    return NextResponse.json({
      success: true,
      createdAt: saved.createdAt,
      model,
      instruments: all.length,
      opportunities: analysis.opportunities?.length ?? 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = /ANTHROPIC_API_KEY/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
