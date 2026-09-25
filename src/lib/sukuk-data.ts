import { prisma } from "./db";
import type { SukukMetricInput, SukukHistoryPoint } from "./sukuk-metrics";

// Assemble metric inputs (instrument reference + latest quote + recent history)
// for the given codes, or the whole universe when codes is omitted.
export async function buildMetricInputs(
  codes?: string[]
): Promise<SukukMetricInput[]> {
  const instruments = await prisma.sukukInstrument.findMany({
    where: codes && codes.length ? { code: { in: codes } } : undefined,
    orderBy: { code: "asc" },
  });
  if (instruments.length === 0) return [];
  const codeList = instruments.map((i) => i.code);

  // Latest quote per code.
  const quotes = await prisma.$queryRawUnsafe<
    Array<{
      code: string;
      instrumentYield: number | null;
      bidYield: number | null;
      askYield: number | null;
      lastPrice: number | null;
      bidPrice: number | null;
      askPrice: number | null;
    }>
  >(
    `SELECT q.code, q.instrumentYield, q.bidYield, q.askYield, q.lastPrice, q.bidPrice, q.askPrice
     FROM "SukukQuote" q
     JOIN (SELECT code, MAX(scrapedAt) AS mx FROM "SukukQuote" GROUP BY code) t
       ON t.code = q.code AND t.mx = q.scrapedAt`
  );
  const quoteByCode = new Map<string, (typeof quotes)[number]>();
  for (const q of quotes) if (!quoteByCode.has(q.code)) quoteByCode.set(q.code, q);

  // Recent history per code (ascending), keep the tail for liquidity/trend.
  const hist = await prisma.sukukHistoricalPrice.findMany({
    where: { code: { in: codeList } },
    select: {
      code: true,
      date: true,
      close: true,
      yield: true,
      volume: true,
      trades: true,
    },
    orderBy: [{ code: "asc" }, { date: "asc" }],
  });
  const histByCode = new Map<string, SukukHistoryPoint[]>();
  for (const h of hist) {
    let arr = histByCode.get(h.code);
    if (!arr) {
      arr = [];
      histByCode.set(h.code, arr);
    }
    arr.push({
      date: h.date,
      close: h.close,
      yield: h.yield,
      volume: h.volume,
      trades: h.trades,
    });
  }

  return instruments.map((inst) => {
    const q = quoteByCode.get(inst.code);
    return {
      code: inst.code,
      name: inst.name,
      isin: inst.isin,
      couponType: inst.couponType,
      couponRate: inst.couponRate,
      maturityDate: inst.maturityDate,
      parValue: inst.parValue,
      issuanceAmount: inst.issuanceAmount,
      currency: inst.currency,
      couponFrequency: inst.couponFrequency,
      lastPrice: q?.lastPrice ?? null,
      instrumentYield: q?.instrumentYield ?? null,
      bidYield: q?.bidYield ?? null,
      askYield: q?.askYield ?? null,
      bidPrice: q?.bidPrice ?? null,
      askPrice: q?.askPrice ?? null,
      history: (histByCode.get(inst.code) ?? []).slice(-150),
    };
  });
}
