import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMetricInputs } from "@/lib/sukuk-data";
import { computeBaseMetrics, fillRelativeMetrics } from "@/lib/sukuk-metrics";
import { analyzeUniverse } from "@/lib/sukuk-analyst";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/sukuk/commentary -> latest stored universe (market-wide) analysis.
export async function GET() {
  const latest = await prisma.sukukAnalysis.findFirst({
    where: { scope: "universe" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return NextResponse.json({ analysis: null });
  return NextResponse.json({
    createdAt: latest.createdAt,
    model: latest.model,
    analysis: JSON.parse(latest.data),
  });
}

// POST /api/sukuk/commentary -> generate a fresh market-wide commentary now
// (login-gated, user-triggered; the daily cron does the same on a schedule).
export async function POST() {
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
      createdAt: saved.createdAt,
      model,
      analysis,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = /ANTHROPIC_API_KEY/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
