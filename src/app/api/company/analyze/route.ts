import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadStockMetrics } from "@/lib/stock-metrics";
import { analyzeStock } from "@/lib/stock-analyst";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// GET /api/company/analyze?symbol=1120 -> latest stored analysis.
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  const latest = await prisma.stockAnalysis.findFirst({
    where: { symbol },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return NextResponse.json({ analysis: null });
  return NextResponse.json({
    symbol,
    createdAt: latest.createdAt,
    model: latest.model,
    metrics: latest.metrics ? JSON.parse(latest.metrics) : null,
    analysis: JSON.parse(latest.data),
  });
}

// POST /api/company/analyze { symbol } -> generate a fresh analysis.
export async function POST(request: NextRequest) {
  let body: { symbol?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const symbol = body.symbol;
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const metrics = await loadStockMetrics(symbol);
  if (!metrics) {
    return NextResponse.json(
      { error: "No financial data for this symbol yet" },
      { status: 404 }
    );
  }

  try {
    const { analysis, model } = await analyzeStock(metrics);
    const saved = await prisma.stockAnalysis.create({
      data: {
        symbol,
        model,
        rating: analysis.rating ?? null,
        score: typeof analysis.score === "number" ? analysis.score : null,
        recommendation: analysis.recommendation ?? null,
        targetView: analysis.valuation ?? null,
        priceTarget:
          typeof analysis.priceTarget === "number" ? analysis.priceTarget : null,
        upside: typeof analysis.upside === "number" ? analysis.upside : null,
        summary: analysis.summary ?? null,
        metrics: JSON.stringify(metrics),
        data: JSON.stringify(analysis),
      },
    });
    return NextResponse.json({
      symbol,
      createdAt: saved.createdAt,
      model,
      metrics,
      analysis,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = /ANTHROPIC_API_KEY/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
