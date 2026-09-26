import { prisma } from "./db";

export interface StockMetrics {
  symbol: string;
  companyName: string;
  sector: string | null;
  currentPrice: number | null;
  week52High: number | null;
  week52Low: number | null;
  week52Position: number | null; // 0-100
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  roe: number | null; // %
  roa: number | null; // %
  netMargin: number | null; // %
  debtToEquity: number | null;
  revenue: number | null; // thousands
  netProfit: number | null; // thousands
  totalAssets: number | null;
  totalEquity: number | null;
  earningsGrowthYoY: number | null; // %
  revenueGrowthYoY: number | null; // %
  earningsCagr3y: number | null; // %
  pegRatio: number | null;
  dividendYield: number | null; // %
  dividendCount: number;
  return1Y: number | null; // %
  return3Y: number | null; // %
  periods: string[]; // annual periods used
  latestPeriod: string | null;
}

function parseVal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, "").replace(/[^0-9.\-]/g, "");
  if (!s || s === "-" || s === ".") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

interface Sectioned {
  unit?: string;
  balanceSheet?: Record<string, string>;
  incomeStatement?: Record<string, string>;
  cashFlows?: Record<string, string>;
}

export async function loadStockMetrics(
  symbol: string
): Promise<StockMetrics | null> {
  const [latestStock, profile, statements] = await Promise.all([
    prisma.stockRecord.findFirst({
      where: { symbol },
      orderBy: { scrapedAt: "desc" },
    }),
    prisma.companyProfile.findUnique({ where: { symbol } }),
    prisma.financialStatement.findMany({
      where: { symbol, type: "annual" },
      orderBy: { period: "desc" },
      take: 4,
    }),
  ]);

  if (!latestStock && statements.length === 0) return null;

  let dividends: Array<{ dividendAmount: string | null }> = [];
  if (profile) {
    dividends = await prisma.dividend.findMany({
      where: { profileId: profile.id },
      orderBy: { announcedDate: "desc" },
      take: 4,
      select: { dividendAmount: true },
    });
  }

  const currentPrice = latestStock?.lastTradePrice ?? null;
  const week52High = latestStock?.week52High ?? null;
  const week52Low = latestStock?.week52Low ?? null;
  const week52Position =
    currentPrice != null &&
    week52High != null &&
    week52Low != null &&
    week52High !== week52Low
      ? ((currentPrice - week52Low) / (week52High - week52Low)) * 100
      : null;

  const annuals = statements.map((s) => ({
    period: s.period,
    d: JSON.parse(s.data) as Sectioned,
  }));
  const latest = annuals[0]?.d;
  const is0 = latest?.incomeStatement ?? {};
  const bs0 = latest?.balanceSheet ?? {};

  const eps = parseVal(is0["Profit (Loss) per Share"]);
  const revenue = parseVal(is0["Total Revenue (Sales/Operating)"]);
  const netProfit = parseVal(
    is0["Net Profit (Loss) Attributable to Shareholders of the Issuer"]
  );
  const totalEquity = parseVal(
    bs0["Total Shareholders Equity (After Deducting the Minority Equity)"] ??
      bs0["Shareholders Equity"]
  );
  const totalAssets = parseVal(bs0["Total Assets"]);
  const totalLiabilities = parseVal(bs0["Total Liabilities"]);

  const peRatio = eps && eps > 0 && currentPrice ? currentPrice / eps : null;
  const sharesEst = eps && netProfit ? (netProfit * 1000) / eps : null;
  const bvps = totalEquity && sharesEst ? (totalEquity * 1000) / sharesEst : null;
  const pbRatio = bvps && currentPrice ? currentPrice / bvps : null;
  const roe = totalEquity && netProfit ? (netProfit / totalEquity) * 100 : null;
  const roa = totalAssets && netProfit ? (netProfit / totalAssets) * 100 : null;
  const netMargin = revenue && netProfit ? (netProfit / revenue) * 100 : null;
  const debtToEquity =
    totalLiabilities && totalEquity ? totalLiabilities / totalEquity : null;

  // Growth
  const series = annuals.map((a) => ({
    period: a.period,
    revenue: parseVal(a.d.incomeStatement?.["Total Revenue (Sales/Operating)"]),
    netProfit: parseVal(
      a.d.incomeStatement?.[
        "Net Profit (Loss) Attributable to Shareholders of the Issuer"
      ]
    ),
  }));
  let earningsGrowthYoY: number | null = null;
  let revenueGrowthYoY: number | null = null;
  if (series.length >= 2) {
    const [a, b] = series;
    if (a.netProfit != null && b.netProfit && b.netProfit > 0)
      earningsGrowthYoY = ((a.netProfit - b.netProfit) / b.netProfit) * 100;
    if (a.revenue != null && b.revenue && b.revenue > 0)
      revenueGrowthYoY = ((a.revenue - b.revenue) / b.revenue) * 100;
  }
  let earningsCagr3y: number | null = null;
  if (series.length >= 3) {
    const first = series[series.length - 1].netProfit;
    const last = series[0].netProfit;
    const yrs = series.length - 1;
    if (first && first > 0 && last && last > 0)
      earningsCagr3y = (Math.pow(last / first, 1 / yrs) - 1) * 100;
  }
  const pegRatio =
    peRatio && earningsGrowthYoY && earningsGrowthYoY > 0
      ? peRatio / earningsGrowthYoY
      : null;

  // Dividends (rough annualised yield)
  const divSum = dividends.reduce((s, d) => {
    const a = parseFloat((d.dividendAmount || "0").replace(/[^0-9.]/g, ""));
    return s + (isNaN(a) ? 0 : a);
  }, 0);
  const estAnnualDiv = dividends.length >= 2 ? divSum : divSum * 2;
  const dividendYield =
    currentPrice && currentPrice > 0 ? (estAnnualDiv / currentPrice) * 100 : null;

  // Price returns
  const prices = await prisma.historicalPrice.findMany({
    where: { symbol },
    orderBy: { date: "desc" },
    take: 900,
    select: { date: true, close: true },
  });
  const priceNow = prices[0]?.close ?? currentPrice ?? null;
  const dateBack = (yrs: number) =>
    new Date(new Date().setFullYear(new Date().getFullYear() - yrs))
      .toISOString()
      .split("T")[0];
  const p1 = prices.find((p) => p.date <= dateBack(1))?.close ?? null;
  const p3 = prices.find((p) => p.date <= dateBack(3))?.close ?? null;
  const return1Y =
    priceNow && p1 ? ((priceNow - p1) / p1) * 100 : null;
  const return3Y =
    priceNow && p3 ? ((priceNow - p3) / p3) * 100 : null;

  return {
    symbol,
    companyName: profile?.companyName || latestStock?.companyName || symbol,
    sector: profile?.sector ?? null,
    currentPrice,
    week52High,
    week52Low,
    week52Position: week52Position != null ? Math.round(week52Position) : null,
    peRatio: round(peRatio),
    pbRatio: round(pbRatio),
    eps: round(eps),
    roe: round(roe),
    roa: round(roa),
    netMargin: round(netMargin),
    debtToEquity: round(debtToEquity),
    revenue,
    netProfit,
    totalAssets,
    totalEquity,
    earningsGrowthYoY: round(earningsGrowthYoY, 1),
    revenueGrowthYoY: round(revenueGrowthYoY, 1),
    earningsCagr3y: round(earningsCagr3y, 1),
    pegRatio: round(pegRatio),
    dividendYield: round(dividendYield),
    dividendCount: dividends.length,
    return1Y: round(return1Y, 1),
    return3Y: round(return3Y, 1),
    periods: annuals.map((a) => a.period),
    latestPeriod: annuals[0]?.period ?? null,
  };
}

function round(n: number | null | undefined, dp = 2): number | null {
  if (n === null || n === undefined || isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
