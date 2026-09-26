import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadStockMetrics } from "@/lib/stock-metrics";
import { analyzeStock } from "@/lib/stock-analyst";
import { ALL_SYMBOLS } from "@/lib/symbols";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Batch AI analysis across companies. Chunked + resumable:
// ?offset=&limit= process a slice; ?skipRecentHours=N skips symbols analysed
// within the last N hours. Guarded by CRON_SECRET.
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const started = Date.now();
  const sp = request.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const limit = Math.max(1, parseInt(sp.get("limit") || "10", 10) || 10);
  const skipRecentHours = parseInt(sp.get("skipRecentHours") || "0", 10) || 0;
  const BUDGET = 250_000;

  // Only symbols that have financial data are analysable.
  const withFin = await prisma.financialStatement.findMany({
    distinct: ["symbol"],
    select: { symbol: true },
  });
  const finSet = new Set(withFin.map((r) => r.symbol));
  const symbols = ALL_SYMBOLS.filter((s) => finSet.has(s));
  const slice = symbols.slice(offset, offset + limit);

  let recentCutoff: Date | null = null;
  if (skipRecentHours > 0)
    recentCutoff = new Date(Date.now() - skipRecentHours * 3600_000);

  const results: Array<Record<string, unknown>> = [];
  let processed = 0;
  let analyzed = 0;
  let skipped = 0;
  let failed = 0;
  let timedOut = false;

  for (const symbol of slice) {
    if (Date.now() - started > BUDGET) {
      timedOut = true;
      break;
    }
    processed++;
    try {
      if (recentCutoff) {
        const last = await prisma.stockAnalysis.findFirst({
          where: { symbol },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (last && last.createdAt > recentCutoff) {
          skipped++;
          continue;
        }
      }
      const metrics = await loadStockMetrics(symbol);
      if (!metrics) {
        skipped++;
        continue;
      }
      const { analysis, model } = await analyzeStock(metrics);
      await prisma.stockAnalysis.create({
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
      analyzed++;
      results.push({
        symbol,
        rating: analysis.rating,
        target: analysis.priceTarget,
      });
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ symbol, error: msg });
      // Stop early on a hard credit/config error — no point burning the loop.
      if (/ANTHROPIC_API_KEY|credit balance/i.test(msg)) {
        return NextResponse.json(
          { success: false, error: msg, offset, processed, analyzed, failed },
          { status: 503 }
        );
      }
    }
  }

  const nextOffset = offset + processed;
  return NextResponse.json({
    success: true,
    total: symbols.length,
    offset,
    processed,
    analyzed,
    skipped,
    failed,
    timedOut,
    done: nextOffset >= symbols.length,
    nextOffset: nextOffset < symbols.length ? nextOffset : null,
    elapsedMs: Date.now() - started,
    results,
  });
}
