import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMetricInputs } from "@/lib/sukuk-data";
import { computeBaseMetrics, fillRelativeMetrics } from "@/lib/sukuk-metrics";
import { analyzeInstrument } from "@/lib/sukuk-analyst";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// GET /api/sukuk/analyze?code=5379  -> latest stored analysis for a sukuk.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  const latest = await prisma.sukukAnalysis.findFirst({
    where: { scope: "instrument", code },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) {
    return NextResponse.json({ analysis: null });
  }
  return NextResponse.json({
    code,
    createdAt: latest.createdAt,
    model: latest.model,
    rating: latest.rating,
    score: latest.score,
    strategy: latest.strategy,
    summary: latest.summary,
    metrics: latest.metrics ? JSON.parse(latest.metrics) : null,
    analysis: JSON.parse(latest.data),
  });
}

// POST /api/sukuk/analyze { code } -> generate a fresh analysis for one sukuk.
export async function POST(request: NextRequest) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const code = body.code;
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const todayISO = new Date().toISOString().split("T")[0];
  // Compute metrics for the whole universe so relative fields (govt spread,
  // yield percentile) are correct, then pick the requested instrument.
  const inputs = await buildMetricInputs();
  if (inputs.length === 0) {
    return NextResponse.json({ error: "No sukuk data yet" }, { status: 404 });
  }
  const all = fillRelativeMetrics(
    inputs.map((i) => computeBaseMetrics(i, todayISO))
  );
  const m = all.find((x) => x.code === code);
  if (!m) {
    return NextResponse.json({ error: `Unknown code ${code}` }, { status: 404 });
  }

  try {
    const { analysis, model } = await analyzeInstrument(m);
    const saved = await prisma.sukukAnalysis.create({
      data: {
        scope: "instrument",
        code,
        model,
        rating: analysis.rating ?? null,
        score: typeof analysis.score === "number" ? analysis.score : null,
        strategy: analysis.strategy ?? null,
        summary: analysis.summary ?? null,
        metrics: JSON.stringify(m),
        data: JSON.stringify(analysis),
      },
    });
    return NextResponse.json({
      code,
      createdAt: saved.createdAt,
      model,
      metrics: m,
      analysis,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = /ANTHROPIC_API_KEY/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
