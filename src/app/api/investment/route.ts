import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BrokerSlice {
  id: string;
  capitalFirm: string;
  qty: number;
  totalCost: number | null;
  brokerCurrentValue: number | null;
}

interface SaudiStockRow {
  stockCode: string;
  companyName: string | null;
  sector: string | null;
  qty: number;
  avgCost: number | null;
  totalCost: number | null;
  brokerMarketPrice: number | null;
  brokerCurrentValue: number | null;
  livePrice: number | null;
  liveValue: number | null;
  livePctChange: number | null;
  pnl: number | null;
  pnlPct: number | null;
  brokers: BrokerSlice[];
}

interface SaudiFundRow {
  fundName: string;
  qty: number;
  avgCostPerUnit: number | null;
  totalCost: number | null;
  closePrice: number | null;
  marketValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  brokers: Array<{
    id: string;
    capitalFirm: string;
    qty: number;
    totalCost: number | null;
    marketValue: number | null;
  }>;
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
      }),
      prisma.investmentSaudiFund.findMany({
        where: { uploadId: upload.id },
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
  type Live = { price: number | null; pct: number | null; companyName: string };
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

  const profiles = await prisma.companyProfile.findMany({
    select: { symbol: true, sector: true },
  });
  const sectorMap = new Map<string, string | null>();
  for (const p of profiles) sectorMap.set(p.symbol, p.sector);

  // ---- Aggregate Saudi stocks by stockCode (sum across brokers) ----
  type SaudiAgg = {
    stockCode: string;
    qty: number;
    totalCost: number;
    hasCost: boolean;
    brokerCurrentValue: number;
    hasBrokerValue: boolean;
    brokerMarketPrice: number | null;
    brokers: BrokerSlice[];
  };
  const saudiAgg = new Map<string, SaudiAgg>();
  for (const h of saudiStocks) {
    const cur =
      saudiAgg.get(h.stockCode) ??
      ({
        stockCode: h.stockCode,
        qty: 0,
        totalCost: 0,
        hasCost: false,
        brokerCurrentValue: 0,
        hasBrokerValue: false,
        brokerMarketPrice: null,
        brokers: [],
      } as SaudiAgg);
    cur.qty += h.qty;
    if (h.totalCost != null) {
      cur.totalCost += h.totalCost;
      cur.hasCost = true;
    }
    if (h.brokerCurrentValue != null) {
      cur.brokerCurrentValue += h.brokerCurrentValue;
      cur.hasBrokerValue = true;
    }
    if (cur.brokerMarketPrice == null && h.brokerMarketPrice != null) {
      cur.brokerMarketPrice = h.brokerMarketPrice;
    }
    cur.brokers.push({
      id: h.id,
      capitalFirm: h.capitalFirm,
      qty: h.qty,
      totalCost: h.totalCost,
      brokerCurrentValue: h.brokerCurrentValue,
    });
    saudiAgg.set(h.stockCode, cur);
  }

  const saudiRows: SaudiStockRow[] = Array.from(saudiAgg.values()).map((a) => {
    const live =
      priceMap.get(a.stockCode) ??
      priceMap.get(a.stockCode.padStart(4, "0")) ??
      priceMap.get(a.stockCode.replace(/^0+/, "")) ??
      null;
    const livePrice = live?.price ?? null;
    const liveValue = livePrice != null ? livePrice * a.qty : null;
    const totalCost = a.hasCost ? a.totalCost : null;
    const avgCost = totalCost != null && a.qty > 0 ? totalCost / a.qty : null;
    const pnl =
      liveValue != null && totalCost != null ? liveValue - totalCost : null;
    const pnlPct =
      pnl != null && totalCost != null && totalCost > 0
        ? (pnl / totalCost) * 100
        : null;
    return {
      stockCode: a.stockCode,
      companyName: live?.companyName ?? null,
      sector: sectorMap.get(a.stockCode) ?? null,
      qty: a.qty,
      avgCost,
      totalCost,
      brokerMarketPrice: a.brokerMarketPrice,
      brokerCurrentValue: a.hasBrokerValue ? a.brokerCurrentValue : null,
      livePrice,
      liveValue,
      livePctChange: live?.pct ?? null,
      pnl,
      pnlPct,
      brokers: a.brokers,
    };
  });

  saudiRows.sort(
    (a, b) =>
      (b.liveValue ?? b.brokerCurrentValue ?? 0) -
      (a.liveValue ?? a.brokerCurrentValue ?? 0)
  );

  // ---- Aggregate Saudi funds by fundName ----
  type FundAgg = {
    fundName: string;
    qty: number;
    totalCost: number;
    hasCost: boolean;
    marketValue: number;
    hasMarket: boolean;
    closePrice: number | null;
    brokers: SaudiFundRow["brokers"];
  };
  const fundAgg = new Map<string, FundAgg>();
  for (const f of saudiFunds) {
    const cur =
      fundAgg.get(f.fundName) ??
      ({
        fundName: f.fundName,
        qty: 0,
        totalCost: 0,
        hasCost: false,
        marketValue: 0,
        hasMarket: false,
        closePrice: null,
        brokers: [],
      } as FundAgg);
    cur.qty += f.qty;
    if (f.totalCost != null) {
      cur.totalCost += f.totalCost;
      cur.hasCost = true;
    }
    if (f.marketValue != null) {
      cur.marketValue += f.marketValue;
      cur.hasMarket = true;
    }
    if (cur.closePrice == null && f.closePrice != null) cur.closePrice = f.closePrice;
    cur.brokers.push({
      id: f.id,
      capitalFirm: f.capitalFirm,
      qty: f.qty,
      totalCost: f.totalCost,
      marketValue: f.marketValue,
    });
    fundAgg.set(f.fundName, cur);
  }
  const fundRows: SaudiFundRow[] = Array.from(fundAgg.values()).map((a) => {
    const totalCost = a.hasCost ? a.totalCost : null;
    const marketValue = a.hasMarket ? a.marketValue : null;
    const avgCostPerUnit =
      totalCost != null && a.qty > 0 ? totalCost / a.qty : null;
    const pnl =
      marketValue != null && totalCost != null ? marketValue - totalCost : null;
    const pnlPct =
      pnl != null && totalCost != null && totalCost > 0
        ? (pnl / totalCost) * 100
        : null;
    return {
      fundName: a.fundName,
      qty: a.qty,
      avgCostPerUnit,
      totalCost,
      closePrice: a.closePrice,
      marketValue,
      pnl,
      pnlPct,
      brokers: a.brokers,
    };
  });
  fundRows.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

  // ---- Totals ----
  const cashTotal = cash.reduce((s, c) => s + c.amount, 0);
  const saudiLiveValue = saudiRows.reduce(
    (s, r) => s + (r.liveValue ?? r.brokerCurrentValue ?? 0),
    0
  );
  const saudiCost = saudiRows.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const saudiPnl = saudiLiveValue - saudiCost;
  const saudiUnmatched = saudiRows.filter((r) => r.livePrice == null).length;

  const fundsValue = fundRows.reduce((s, f) => s + (f.marketValue ?? 0), 0);
  const fundsCost = fundRows.reduce((s, f) => s + (f.totalCost ?? 0), 0);

  const usaValue = usaStocks.reduce((s, u) => s + (u.marketValue ?? 0), 0);
  const usaCost = usaStocks.reduce((s, u) => s + (u.costValue ?? 0), 0);

  const gulfValue = gulfStocks.reduce((s, g) => s + (g.currentValue ?? 0), 0);

  const grandTotal = cashTotal + saudiLiveValue + fundsValue + usaValue + gulfValue;
  const grandCost = saudiCost + fundsCost + usaCost;

  // ---- Treemap: root + per-category details (sized by % of details) ----
  const treemap = {
    root: [
      {
        id: "saudi-stocks",
        name: "Saudi Stocks",
        value: saudiLiveValue,
        count: saudiRows.length,
      },
      {
        id: "saudi-funds",
        name: "Saudi Funds",
        value: fundsValue,
        count: fundRows.length,
      },
      { id: "usa", name: "USA Stocks", value: usaValue, count: usaStocks.length },
      {
        id: "gulf",
        name: "Gulf Stocks",
        value: gulfValue,
        count: gulfStocks.length,
      },
      { id: "cash", name: "Cash", value: cashTotal, count: cash.length },
    ].filter((c) => c.value > 0),

    details: {
      "saudi-stocks": saudiRows.map((r) => ({
        id: r.stockCode,
        name: r.companyName ? `${r.stockCode} · ${r.companyName}` : r.stockCode,
        value: r.liveValue ?? r.brokerCurrentValue ?? 0,
        meta: {
          sector: r.sector,
          qty: r.qty,
          avgCost: r.avgCost,
          livePrice: r.livePrice,
          pnl: r.pnl,
          pnlPct: r.pnlPct,
          brokerCount: r.brokers.length,
        },
      })),
      "saudi-funds": fundRows.map((f) => ({
        id: f.fundName,
        name: f.fundName,
        value: f.marketValue ?? 0,
        meta: {
          qty: f.qty,
          avgCostPerUnit: f.avgCostPerUnit,
          closePrice: f.closePrice,
          pnl: f.pnl,
          pnlPct: f.pnlPct,
          brokerCount: f.brokers.length,
        },
      })),
      usa: usaStocks.map((u) => ({
        id: u.ticker,
        name: u.ticker,
        value: u.marketValue ?? 0,
        meta: {
          qty: u.qty,
          closePrice: u.closePrice,
          pnl: u.profitLoss,
        },
      })),
      gulf: gulfStocks.map((g) => ({
        id: `${g.market}-${g.stockCode}`,
        name: `${g.stockCode} (${g.market})`,
        value: g.currentValue ?? 0,
        meta: { qty: g.qty, marketPrice: g.marketPrice, broker: g.capitalFirm },
      })),
      cash: cash.map((c) => ({
        id: `${c.capitalFirm}-${c.portfolio ?? ""}`,
        name: c.portfolio
          ? `${c.capitalFirm} · ${c.portfolio}`
          : c.capitalFirm,
        value: c.amount,
        meta: { broker: c.capitalFirm, portfolio: c.portfolio },
      })),
    },
  };

  // ---- Top 10 holdings overall ----
  type Holding = { name: string; category: string; value: number };
  const allHoldings: Holding[] = [
    ...saudiRows.map((r) => ({
      name: `${r.stockCode}${r.companyName ? " " + r.companyName : ""}`,
      category: "Saudi Stocks",
      value: r.liveValue ?? r.brokerCurrentValue ?? 0,
    })),
    ...fundRows.map((f) => ({
      name: f.fundName.slice(0, 30),
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

  // ---- Per-broker allocation ----
  const brokerMap = new Map<string, number>();
  const add = (k: string, v: number) =>
    brokerMap.set(k, (brokerMap.get(k) ?? 0) + v);
  for (const c of cash) add(c.capitalFirm.toLowerCase(), c.amount);
  for (const r of saudiRows) {
    const totalValue = r.liveValue ?? r.brokerCurrentValue ?? 0;
    // distribute across brokers proportionally to qty
    for (const b of r.brokers) {
      const share = r.qty > 0 ? (b.qty / r.qty) * totalValue : 0;
      add(b.capitalFirm.toLowerCase(), share);
    }
  }
  for (const f of fundRows) {
    for (const b of f.brokers) add(b.capitalFirm.toLowerCase(), b.marketValue ?? 0);
  }
  for (const g of gulfStocks) {
    add((g.capitalFirm ?? "unknown").toLowerCase(), g.currentValue ?? 0);
  }
  const brokerAllocation = Array.from(brokerMap.entries())
    .map(([broker, value]) => ({ broker, value }))
    .sort((a, b) => b.value - a.value);

  // ---- Today's movers ----
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
    treemap,
    topHoldings,
    brokerAllocation,
    topGainers,
    topLosers,
    saudiStocks: saudiRows,
    saudiFunds: fundRows,
    usaStocks,
    gulfStocks,
    cash,
  });
}
