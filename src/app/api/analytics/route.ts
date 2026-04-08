import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getRiyadhDayRange(dateStr: string) {
  // Parse YYYY-MM-DD as Riyadh local date, return UTC start/end
  const [year, month, day] = dateStr.split("-").map(Number);
  // Riyadh is UTC+3
  const start = new Date(Date.UTC(year, month - 1, day, -3, 0, 0)); // 00:00 Riyadh = 21:00 prev day UTC
  const end = new Date(Date.UTC(year, month - 1, day + 1, -3, 0, 0));
  return { start, end };
}

function computeAnalysis(records: Array<{
  lastTradePrice: number | null;
  lastTradeVolume: number | null;
  bestBidPrice: number | null;
  bestOfferPrice: number | null;
  week52High: number | null;
  week52Low: number | null;
}>) {
  const prices = records.map((r) => r.lastTradePrice).filter((p): p is number => p != null);
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

  // Price range
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;

  // Bid-Ask spread
  const spreads: number[] = [];
  const spreadPcts: number[] = [];
  for (const r of records) {
    if (r.bestBidPrice != null && r.bestOfferPrice != null && r.bestBidPrice > 0) {
      const spread = r.bestOfferPrice - r.bestBidPrice;
      const mid = (r.bestOfferPrice + r.bestBidPrice) / 2;
      spreads.push(spread);
      if (mid > 0) spreadPcts.push((spread / mid) * 100);
    }
  }

  // VWAP
  let vwapNum = 0;
  let vwapDen = 0;
  for (const r of records) {
    if (r.lastTradePrice != null && r.lastTradeVolume != null && r.lastTradeVolume > 0) {
      vwapNum += r.lastTradePrice * r.lastTradeVolume;
      vwapDen += r.lastTradeVolume;
    }
  }

  // Price volatility (std dev of price changes between consecutive scrapes)
  const priceChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    priceChanges.push(prices[i] - prices[i - 1]);
  }
  let volatility = 0;
  if (priceChanges.length > 1) {
    const mean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const variance = priceChanges.reduce((a, b) => a + (b - mean) ** 2, 0) / priceChanges.length;
    volatility = Math.sqrt(variance);
  }

  // 52-week position
  const last = records[records.length - 1];
  let week52Position = 50;
  if (last?.week52High != null && last?.week52Low != null && last.week52High !== last.week52Low) {
    week52Position = ((currentPrice - last.week52Low) / (last.week52High - last.week52Low)) * 100;
    week52Position = Math.max(0, Math.min(100, week52Position));
  }

  return {
    priceRange: { min, max, spread: max - min },
    avgBidAskSpread: spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0,
    avgBidAskSpreadPct: spreadPcts.length > 0 ? spreadPcts.reduce((a, b) => a + b, 0) / spreadPcts.length : 0,
    vwap: vwapDen > 0 ? vwapNum / vwapDen : currentPrice,
    priceVolatility: volatility,
    week52Position,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const dateStr = searchParams.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

  const { start, end } = getRiyadhDayRange(dateStr);

  // SUMMARY MODE — no symbol provided
  if (!symbol) {
    // Get latest completed session
    const lastSession = await prisma.scrapeSession.findFirst({
      where: { status: "completed" },
      orderBy: { startedAt: "desc" },
    });

    if (!lastSession) {
      return NextResponse.json({
        date: dateStr,
        stockList: [],
        topGainers: [],
        topLosers: [],
        mostActive: [],
        marketStats: { totalStocks: 0, gainers: 0, losers: 0, unchanged: 0, totalVolume: 0, totalTrades: 0 },
      });
    }

    const stocks = await prisma.stockRecord.findMany({
      where: { sessionId: lastSession.id },
      orderBy: { symbol: "asc" },
    });

    const stockList = stocks.map((s) => ({ symbol: s.symbol, companyName: s.companyName }));

    const withChange = stocks.filter((s) => s.lastTradePctChange != null);
    const sorted = [...withChange].sort((a, b) => (b.lastTradePctChange ?? 0) - (a.lastTradePctChange ?? 0));

    const topGainers = sorted.slice(0, 5).filter((s) => (s.lastTradePctChange ?? 0) > 0).map((s) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      lastTradePrice: s.lastTradePrice,
      lastTradePctChange: s.lastTradePctChange,
      cumulativeVolume: s.cumulativeVolume,
      numberOfTrades: s.numberOfTrades,
    }));

    const topLosers = sorted.slice(-5).reverse().filter((s) => (s.lastTradePctChange ?? 0) < 0).map((s) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      lastTradePrice: s.lastTradePrice,
      lastTradePctChange: s.lastTradePctChange,
      cumulativeVolume: s.cumulativeVolume,
      numberOfTrades: s.numberOfTrades,
    }));

    const byVolume = [...stocks].sort((a, b) => (b.cumulativeVolume ?? 0) - (a.cumulativeVolume ?? 0));
    const mostActive = byVolume.slice(0, 5).map((s) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      lastTradePrice: s.lastTradePrice,
      lastTradePctChange: s.lastTradePctChange,
      cumulativeVolume: s.cumulativeVolume,
      numberOfTrades: s.numberOfTrades,
    }));

    let gainers = 0, losers = 0, unchanged = 0, totalVolume = 0, totalTrades = 0;
    for (const s of stocks) {
      if ((s.lastTradePctChange ?? 0) > 0) gainers++;
      else if ((s.lastTradePctChange ?? 0) < 0) losers++;
      else unchanged++;
      totalVolume += s.cumulativeVolume ?? 0;
      totalTrades += s.numberOfTrades ?? 0;
    }

    return NextResponse.json({
      date: dateStr,
      stockList,
      topGainers,
      topLosers,
      mostActive,
      marketStats: { totalStocks: stocks.length, gainers, losers, unchanged, totalVolume, totalTrades },
    });
  }

  // TIME-SERIES MODE — symbol provided
  const records = await prisma.stockRecord.findMany({
    where: {
      symbol,
      scrapedAt: { gte: start, lt: end },
    },
    orderBy: { scrapedAt: "asc" },
  });

  if (records.length === 0) {
    return NextResponse.json({ error: "No data found for this stock on the selected date" }, { status: 404 });
  }

  const last = records[records.length - 1];

  const timeSeries = records.map((r) => ({
    scrapedAt: r.scrapedAt.toISOString(),
    lastTradePrice: r.lastTradePrice,
    lastTradeVolume: r.lastTradeVolume,
    cumulativeVolume: r.cumulativeVolume,
    numberOfTrades: r.numberOfTrades,
    bestBidPrice: r.bestBidPrice,
    bestOfferPrice: r.bestOfferPrice,
  }));

  const snapshot = {
    todayOpen: last.todayOpen,
    todayHigh: last.todayHigh,
    todayLow: last.todayLow,
    lastTradePrice: last.lastTradePrice,
    lastTradeChange: last.lastTradeChange,
    lastTradePctChange: last.lastTradePctChange,
    week52High: last.week52High,
    week52Low: last.week52Low,
    cumulativeVolume: last.cumulativeVolume,
    numberOfTrades: last.numberOfTrades,
    bestBidPrice: last.bestBidPrice,
    bestOfferPrice: last.bestOfferPrice,
  };

  const analysis = computeAnalysis(records);

  return NextResponse.json({
    stock: { symbol: last.symbol, companyName: last.companyName },
    timeSeries,
    snapshot,
    analysis,
  });
}
