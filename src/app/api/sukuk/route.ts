import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMetricInputs } from "@/lib/sukuk-data";
import { computeBaseMetrics, fillRelativeMetrics } from "@/lib/sukuk-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/sukuk -> all instruments with computed metrics + latest stored
// analysis rating (deterministic; no LLM call).
export async function GET() {
  const todayISO = new Date().toISOString().split("T")[0];
  const inputs = await buildMetricInputs();
  const metrics = fillRelativeMetrics(
    inputs.map((i) => computeBaseMetrics(i, todayISO))
  );

  // Latest instrument analysis per code.
  const ratings = await prisma.$queryRawUnsafe<
    Array<{ code: string; rating: string | null; score: number | null; createdAt: string }>
  >(
    `SELECT a.code, a.rating, a.score, a.createdAt
     FROM "SukukAnalysis" a
     JOIN (SELECT code, MAX(createdAt) AS mx FROM "SukukAnalysis"
           WHERE scope='instrument' AND code IS NOT NULL GROUP BY code) t
       ON t.code = a.code AND t.mx = a.createdAt`
  );
  const ratingByCode = new Map(ratings.map((r) => [r.code, r]));

  const rows = metrics.map((m) => ({
    ...m,
    analysis: ratingByCode.get(m.code)
      ? {
          rating: ratingByCode.get(m.code)!.rating,
          score: ratingByCode.get(m.code)!.score,
          createdAt: ratingByCode.get(m.code)!.createdAt,
        }
      : null,
  }));

  const priced = metrics.filter((m) => m.marketYield != null);
  const summary = {
    total: metrics.length,
    government: metrics.filter((m) => m.isGovernment).length,
    corporate: metrics.filter((m) => !m.isGovernment).length,
    liquid: metrics.filter((m) => m.liquidity === "liquid").length,
    untraded: metrics.filter((m) => m.liquidity === "untraded").length,
    avgYield:
      priced.length > 0
        ? priced.reduce((s, m) => s + (m.marketYield ?? 0), 0) / priced.length
        : null,
    analyzed: ratings.length,
  };

  return NextResponse.json({ asOf: todayISO, summary, instruments: rows });
}
