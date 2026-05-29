import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SaudiStockRow {
  capitalFirm: string;
  stockCode: string;
  companyName: string | null;
  sector: string | null;
  qty: number;
  stockCost: number | null;
  totalCost: number | null;
  brokerMarketPrice: number | null;
  brokerCurrentValue: number | null;
  livePrice: number | null;
  liveValue: number | null;
  livePctChange: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

export async function GET() {
  const upload = await prisma.investmentUpload.findFirst({
    orderBy: { uploadedAt: "desc" },
  });

  if (!upload) {
    return NextResponse.json({ upload: null });
  }

  const [cash, saudiStocks, saudiFunds, usaStocks, gulfStocks, lastSession] =
    await Promise.all([
      prisma.investmentCash.findMany({ where: { uploadId: upload.id } }),
      prisma.investmentSaudiStock.findMany({
        where: { uploadId: upload.id },
        orderBy: { brokerCurrentValue: "desc" },
      }),
      prisma.investmentSaudiFund.findMany({
        where: { uploadId: upload.id },
        orderBy: { marketValue: "desc" },
      }),
      prisma.investmentUsaStock.findMany({
        where: { uploadId: upload.id },
        orderBy: { marketValue: "desc" },
      }),
      prisma.investmentGulfStock.findMany({
        where: { uploadId: upload.id },
        orderBy: { currentValue: "desc" },
      }),
      prisma.scrapeSession.findFirst({
        where: { status: "completed" },
        orderBy: { startedAt: "desc" },
      }),
    ]);

  // Build live price + company name lookup from latest scrape
  type Live = {
    price: number | null;
    pct: number | null;
    companyName: string;
  };
  const priceMap = new Map<string, Live>();
  if (lastSession) {
    const records = await prisma.stockRecord.findMany({
      where: { sessionId: lastSession.id },
      select: {
        symbol: true,
        companyName: true,
        lastTradePrice: true,
        lastTradePctChange: true,
      },
    });
    for (const r of records) {
      const live: Live = {
        price: r.lastTradePrice,
        pct: r.lastTradePctChange,
        companyName: r.companyName,
      };
      priceMap.set(r.symbol, live);
      const padded = r.symbol.padStart(4, "0");
      if (padded !== r.symbol && !priceMap.has(padded)) priceMap.set(padded, live);
      const unpadded = r.symbol.replace(/^0+/, "");
      if (unpadded && unpadded !== r.symbol && !priceMap.has(unpadded))
        priceMap.set(unpadded, live);
    }
  }

  // Pull sector hints from CompanyProfile if available
  const profiles = await prisma.companyProfile.findMany({
    select: { symbol: true, sector: true },
  });
  const sectorMap = new Map<string, string | null>();
  for (const p of profiles) sectorMap.set(p.symbol, p.sector);

  const saudiRows: SaudiStockRow[] = saudiStocks.map((h) => {
    const live =
      priceMap.get(h.stockCode) ??
      priceMap.get(h.stockCode.padStart(4, "0")) ??
      priceMap.get(h.stockCode.replace(/^0+/, "")) ??
      null;
    const livePrice = live?.price ?? null;
    const liveValue = livePrice != null ? livePrice * h.qty : null;
    const cost = h.totalCost ?? null;
    const pnl = liveValue != null && cost != null ? liveValue - cost : null;
    const pnlPct =
      pnl != null && cost != null && cost > 0 ? (pnl / cost) * 100 : null;
    return {
      capitalFirm: h.capitalFirm,
      stockCode: h.stockCode,
      companyName: live?.companyName ?? null,
      sector: sectorMap.get(h.stockCode) ?? null,
      qty: h.qty,
      stockCost: h.stockCost,
      totalCost: h.totalCost,
      brokerMarketPrice: h.brokerMarketPrice,
      brokerCurrentValue: h.brokerCurrentValue,
      livePrice,
      liveValue,
      livePctChange: live?.pct ?? null,
      pnl,
      pnlPct,
    };
  });

  // Sort Saudi stocks by live value desc, fall back to broker value
  saudiRows.sort(
    (a, b) =>
      (b.liveValue ?? b.brokerCurrentValue ?? 0) -
      (a.liveValue ?? a.brokerCurrentValue ?? 0)
  );

  // AGGREGATES
  const cashTotal = cash.reduce((s, c) => s + c.amount, 0);

  const saudiLiveValue = saudiRows.reduce(
    (s, r) => s + (r.liveValue ?? r.brokerCurrentValue ?? 0),
    0
  );
  const saudiCost = saudiRows.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const saudiPnl = saudiLiveValue - saudiCost;
  const saudiUnmatched = saudiRows.filter((r) => r.livePrice == null).length;

  const fundsValue = saudiFunds.reduce(
    (s, f) => s + (f.marketValue ?? 0),
    0
  );
  const fundsCost = saudiFunds.reduce((s, f) => s + (f.totalCost ?? 0), 0);

  const usaValue = usaStocks.reduce((s, u) => s + (u.marketValue ?? 0), 0);
  const usaCost = usaStocks.reduce((s, u) => s + (u.costValue ?? 0), 0);

  const gulfValue = gulfStocks.reduce(
    (s, g) => s + (g.currentValue ?? 0),
    0
  );

  const grandTotal =
    cashTotal + saudiLiveValue + fundsValue + usaValue + gulfValue;
  const grandCost = saudiCost + fundsCost + usaCost;

  // Asset allocation pie
  const allocation = [
    { category: "Saudi Stocks", value: saudiLiveValue, count: saudiRows.length },
    { category: "Saudi Funds", value: fundsValue, count: saudiFunds.length },
    { category: "USA Stocks", value: usaValue, count: usaStocks.length },
    { category: "Gulf Stocks", value: gulfValue, count: gulfStocks.length },
    { category: "Cash", value: cashTotal, count: cash.length },
  ].filter((a) => a.value > 0);

  // Top 10 holdings overall (Saudi stocks valued live; funds + usa + gulf at snapshot)
  type Holding = { name: string; category: string; value: number };
  const allHoldings: Holding[] = [
    ...saudiRows.map((r) => ({
      name: `${r.stockCode}${r.companyName ? " " + r.companyName : ""}`,
      category: "Saudi Stocks",
      value: r.liveValue ?? r.brokerCurrentValue ?? 0,
    })),
    ...saudiFunds.map((f) => ({
      name: f.fundName,
      category: "Saudi Funds",
      value: f.marketValue ?? 0,
    })),
    ...usaStocks.map((u) => ({
      name: u.ticker,
      category: "USA Stocks",
      value: u.marketValue ?? 0,
    })),
    ...gulfStocks.map((g) => ({
      name: `${g.stockCode} (${g.market})`,
      category: "Gulf Stocks",
      value: g.currentValue ?? 0,
    })),
  ];
  const topHoldings = [...allHoldings]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Per-broker allocation
  const brokerMap = new Map<string, number>();
  for (const c of cash)
    brokerMap.set(
      c.capitalFirm.toLowerCase(),
      (brokerMap.get(c.capitalFirm.toLowerCase()) ?? 0) + c.amount
    );
  for (const r of saudiRows) {
    const k = r.capitalFirm.toLowerCase();
    brokerMap.set(
      k,
      (brokerMap.get(k) ?? 0) + (r.liveValue ?? r.brokerCurrentValue ?? 0)
    );
  }
  for (const f of saudiFunds) {
    const k = f.capitalFirm.toLowerCase();
    brokerMap.set(k, (brokerMap.get(k) ?? 0) + (f.marketValue ?? 0));
  }
  for (const g of gulfStocks) {
    const k = (g.capitalFirm ?? "unknown").toLowerCase();
    brokerMap.set(k, (brokerMap.get(k) ?? 0) + (g.currentValue ?? 0));
  }
  const brokerAllocation = Array.from(brokerMap.entries())
    .map(([broker, value]) => ({ broker, value }))
    .sort((a, b) => b.value - a.value);

  // Saudi top gainers/losers among holdings (by today's % change)
  const movers = saudiRows.filter((r) => r.livePctChange != null);
  const topGainers = [...movers]
    .sort((a, b) => (b.livePctChange ?? 0) - (a.livePctChange ?? 0))
    .slice(0, 5);
  const topLosers = [...movers]
    .sort((a, b) => (a.livePctChange ?? 0) - (b.livePctChange ?? 0))
    .slice(0, 5);

  return NextResponse.json({
    upload: {
      id: upload.id,
      fileName: upload.fileName,
      uploadedAt: upload.uploadedAt,
    },
    liveSessionAt: lastSession?.startedAt ?? null,
    totals: {
      grandTotal,
      grandCost,
      grandPnl: grandTotal - grandCost - cashTotal, // cost only applies to invested portion
      cash: cashTotal,
      saudiStocksLive: saudiLiveValue,
      saudiStocksCost: saudiCost,
      saudiStocksPnl: saudiPnl,
      saudiStocksPnlPct: saudiCost > 0 ? (saudiPnl / saudiCost) * 100 : 0,
      saudiStocksUnmatched: saudiUnmatched,
      saudiFundsValue: fundsValue,
      saudiFundsCost: fundsCost,
      saudiFundsPnl: fundsValue - fundsCost,
      usaValue,
      usaCost,
      usaPnl: usaValue - usaCost,
      gulfValue,
    },
    allocation,
    topHoldings,
    brokerAllocation,
    topGainers,
    topLosers,
    saudiStocks: saudiRows,
    saudiFunds,
    usaStocks,
    gulfStocks,
    cash,
  });
}
