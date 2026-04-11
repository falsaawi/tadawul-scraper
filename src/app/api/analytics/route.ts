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

const SECTOR_MAP: Record<string, string[]> = {
  "Energy": ["2030","2222","2380","2381","2382","4030"],
  "Materials": ["1201","1202","1210","1211","1301","1304","1320","1321","1322","1323","1324","2001","2010","2020","2060","2090","2150","2170","2180","2200","2210","2220","2223","2240","2250","2290","2300","2310","2330","2350","2360","3002","3003","3004","3005","3007","3008","3010","3020","3030","3040","3050","3060","3080","3090","3091","3092","4143"],
  "Capital Goods": ["1212","1214","1302","1303","2040","2110","2160","2320","2370","4110","4140","4141","4142","4144","4145","4146","4147","4148"],
  "Banks": ["1010","1020","1030","1050","1060","1080","1120","1140","1150","1180"],
  "Financial Services": ["1111","1182","1183","2120","4081","4082","4083","4084","4130","4280"],
  "Insurance": ["8010","8012","8020","8030","8040","8050","8060","8070","8100","8120","8150","8160","8170","8180","8190","8200","8210","8230","8240","8250","8260","8280","8300","8310","8311","8313"],
  "Telecommunication Services": ["7010","7020","7030","7040"],
  "Utilities": ["2080","2081","2082","2083","2084","5110"],
  "REITs": ["4330","4331","4332","4333","4334","4335","4336","4337","4338","4339","4340","4342","4344","4345","4346","4347","4348","4349","4350"],
  "Real Estate Mgmt & Dev't": ["4020","4090","4100","4150","4220","4230","4250","4300","4310","4320","4321","4322","4323","4324","4325","4326","4327"],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const sector = searchParams.get("sector");
  const dateStr = searchParams.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

  const { start, end } = getRiyadhDayRange(dateStr);

  // SECTOR TIME-SERIES MODE
  if (sector) {
    const sectorSymbols = SECTOR_MAP[sector];
    if (!sectorSymbols) {
      return NextResponse.json({ error: "Unknown sector" }, { status: 400 });
    }

    // Get all scrape sessions for the date, aggregate by session time
    const records = await prisma.stockRecord.findMany({
      where: {
        symbol: { in: sectorSymbols },
        scrapedAt: { gte: start, lt: end },
      },
      orderBy: { scrapedAt: "asc" },
      include: { session: { select: { startedAt: true } } },
    });

    // Group by session and compute sector averages
    const bySession = new Map<string, typeof records>();
    for (const r of records) {
      const key = r.session.startedAt.toISOString();
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key)!.push(r);
    }

    const timeSeries = Array.from(bySession.entries()).map(([time, recs]) => {
      const prices = recs.map(r => r.lastTradePrice).filter((p): p is number => p != null);
      const volumes = recs.map(r => r.cumulativeVolume).filter((v): v is number => v != null);
      const changes = recs.map(r => r.lastTradePctChange).filter((c): c is number => c != null);
      return {
        scrapedAt: time,
        avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
        totalVolume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) : null,
        avgChange: changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : null,
        stockCount: recs.length,
      };
    });

    return NextResponse.json({ sector, date: dateStr, timeSeries });
  }

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

    const mapMover = (s: typeof stocks[0]) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      lastTradePrice: s.lastTradePrice,
      lastTradeChange: s.lastTradeChange,
      lastTradePctChange: s.lastTradePctChange,
      cumulativeVolume: s.cumulativeVolume,
      numberOfTrades: s.numberOfTrades,
      todayOpen: s.todayOpen,
      todayHigh: s.todayHigh,
      todayLow: s.todayLow,
      week52High: s.week52High,
      week52Low: s.week52Low,
      bestBidPrice: s.bestBidPrice,
      bestOfferPrice: s.bestOfferPrice,
    });

    // Top 10 gainers & losers
    const topGainers = sorted.slice(0, 10).filter((s) => (s.lastTradePctChange ?? 0) > 0).map(mapMover);
    const topLosers = sorted.slice(-10).reverse().filter((s) => (s.lastTradePctChange ?? 0) < 0).map(mapMover);

    // Most active by volume
    const byVolume = [...stocks].sort((a, b) => (b.cumulativeVolume ?? 0) - (a.cumulativeVolume ?? 0));
    const mostActiveByVolume = byVolume.slice(0, 10).map(mapMover);

    // Most active by number of trades
    const byTrades = [...stocks].sort((a, b) => (b.numberOfTrades ?? 0) - (a.numberOfTrades ?? 0));
    const mostActiveByTrades = byTrades.slice(0, 10).map(mapMover);

    // Biggest price swings (high - low range as % of price)
    const withSwing = stocks
      .filter((s) => s.todayHigh != null && s.todayLow != null && s.lastTradePrice != null && s.lastTradePrice > 0)
      .map((s) => ({
        ...s,
        swingPct: ((s.todayHigh! - s.todayLow!) / s.lastTradePrice!) * 100,
      }))
      .sort((a, b) => b.swingPct - a.swingPct);
    const biggestSwings = withSwing.slice(0, 10).map((s) => ({ ...mapMover(s), swingPct: s.swingPct }));

    // Near 52-week high
    const near52High = stocks
      .filter((s) => s.week52High != null && s.lastTradePrice != null && s.week52High > 0)
      .map((s) => ({
        ...s,
        pctFrom52High: ((s.lastTradePrice! - s.week52High!) / s.week52High!) * 100,
      }))
      .sort((a, b) => b.pctFrom52High - a.pctFrom52High)
      .slice(0, 10)
      .map((s) => ({ ...mapMover(s), pctFrom52High: s.pctFrom52High }));

    // Near 52-week low
    const near52Low = stocks
      .filter((s) => s.week52Low != null && s.lastTradePrice != null && s.week52Low > 0)
      .map((s) => ({
        ...s,
        pctFrom52Low: ((s.lastTradePrice! - s.week52Low!) / s.week52Low!) * 100,
      }))
      .sort((a, b) => a.pctFrom52Low - b.pctFrom52Low)
      .slice(0, 10)
      .map((s) => ({ ...mapMover(s), pctFrom52Low: s.pctFrom52Low }));

    // Widest bid-ask spreads (least liquid)
    const withSpread = stocks
      .filter((s) => s.bestBidPrice != null && s.bestOfferPrice != null && s.bestBidPrice > 0)
      .map((s) => {
        const mid = (s.bestBidPrice! + s.bestOfferPrice!) / 2;
        return { ...s, spreadPct: mid > 0 ? ((s.bestOfferPrice! - s.bestBidPrice!) / mid) * 100 : 0 };
      })
      .sort((a, b) => b.spreadPct - a.spreadPct);
    const widestSpreads = withSpread.slice(0, 10).map((s) => ({ ...mapMover(s), spreadPct: s.spreadPct }));
    const tightestSpreads = [...withSpread].reverse().slice(0, 10).map((s) => ({ ...mapMover(s), spreadPct: s.spreadPct }));

    // Market stats
    let gainers = 0, losers = 0, unchanged = 0, totalVolume = 0, totalTrades = 0;
    let totalValue = 0;
    const changeDist = { up3: 0, up1to3: 0, up0to1: 0, flat: 0, down0to1: 0, down1to3: 0, down3: 0 };

    for (const s of stocks) {
      const pct = s.lastTradePctChange ?? 0;
      if (pct > 0) gainers++;
      else if (pct < 0) losers++;
      else unchanged++;
      totalVolume += s.cumulativeVolume ?? 0;
      totalTrades += s.numberOfTrades ?? 0;
      totalValue += (s.lastTradePrice ?? 0) * (s.cumulativeVolume ?? 0);

      if (pct >= 3) changeDist.up3++;
      else if (pct >= 1) changeDist.up1to3++;
      else if (pct > 0) changeDist.up0to1++;
      else if (pct === 0) changeDist.flat++;
      else if (pct > -1) changeDist.down0to1++;
      else if (pct > -3) changeDist.down1to3++;
      else changeDist.down3++;
    }

    // Average change across market
    const allChanges = stocks.map((s) => s.lastTradePctChange ?? 0);
    const avgChange = allChanges.length > 0 ? allChanges.reduce((a, b) => a + b, 0) / allChanges.length : 0;

    return NextResponse.json({
      date: dateStr,
      stockList,
      topGainers,
      topLosers,
      mostActiveByVolume,
      mostActiveByTrades,
      biggestSwings,
      near52High,
      near52Low,
      widestSpreads,
      tightestSpreads,
      marketStats: {
        totalStocks: stocks.length,
        gainers,
        losers,
        unchanged,
        totalVolume,
        totalTrades,
        totalValue,
        avgChange,
        changeDist,
      },
    });
  }

  // TIME-SERIES MODE — symbol provided
  let records = await prisma.stockRecord.findMany({
    where: {
      symbol,
      scrapedAt: { gte: start, lt: end },
    },
    orderBy: { scrapedAt: "asc" },
  });

  // Fallback: if no data for selected date, use latest available session
  if (records.length === 0) {
    const lastSession = await prisma.scrapeSession.findFirst({
      where: { status: "completed" },
      orderBy: { startedAt: "desc" },
    });
    if (lastSession) {
      records = await prisma.stockRecord.findMany({
        where: { symbol, sessionId: lastSession.id },
        orderBy: { scrapedAt: "asc" },
      });
    }
  }

  if (records.length === 0) {
    return NextResponse.json({ error: "No data found for this stock" }, { status: 404 });
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
