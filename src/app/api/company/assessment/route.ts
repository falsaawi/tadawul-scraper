import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseVal(v: string | undefined | null): number | null {
  if (!v || v === "-") return null;
  const n = parseFloat(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  // Get latest stock data
  const latestStock = await prisma.stockRecord.findFirst({
    where: { symbol },
    orderBy: { scrapedAt: "desc" },
  });

  // Get financial statements
  const statements = await prisma.financialStatement.findMany({
    where: { symbol },
    orderBy: { period: "desc" },
  });

  // Get historical prices
  const prices = await prisma.historicalPrice.findMany({
    where: { symbol },
    orderBy: { date: "desc" },
    take: 1300, // ~5 years
    select: { date: true, close: true, volume: true },
  });

  // Get dividends
  const profile = await prisma.companyProfile.findUnique({ where: { symbol } });
  let dividends: Array<{ dividendAmount: string | null; announcedDate: string | null }> = [];
  if (profile) {
    dividends = await prisma.dividend.findMany({
      where: { profileId: profile.id },
      orderBy: { announcedDate: "desc" },
      select: { dividendAmount: true, announcedDate: true },
    });
  }

  if (!latestStock || statements.length === 0) {
    return NextResponse.json({ error: "Insufficient data" }, { status: 404 });
  }

  // Parse annual statements (most recent 3)
  const annuals = statements
    .filter((s) => s.type === "annual")
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 3);

  const currentPrice = latestStock.lastTradePrice || 0;
  const week52High = latestStock.week52High || 0;
  const week52Low = latestStock.week52Low || 0;

  // --- VALUATION ---
  const latestAnnual = annuals[0]?.data as Record<string, unknown> | null;
  const isData = (latestAnnual?.incomeStatement || {}) as Record<string, string>;
  const bsData = (latestAnnual?.balanceSheet || {}) as Record<string, string>;

  const eps = parseVal(isData["Profit (Loss) per Share"]);
  const totalEquity = parseVal(bsData["Total Shareholders Equity (After Deducting the Minority Equity)"] || bsData["Shareholders Equity"]);
  const totalAssets = parseVal(bsData["Total Assets"]);
  const totalLiabilities = parseVal(bsData["Total Liabilities"]);
  const revenue = parseVal(isData["Total Revenue (Sales/Operating)"]);
  const netProfit = parseVal(isData["Net Profit (Loss) Attributable to Shareholders of the Issuer"]);

  const pe = eps && eps > 0 ? currentPrice / eps : null;
  const sharesEstimate = eps && netProfit ? (netProfit * 1000) / eps : null; // shares in units (data in thousands)
  const bookValuePerShare = totalEquity && sharesEstimate ? (totalEquity * 1000) / sharesEstimate : null;
  const pb = bookValuePerShare ? currentPrice / bookValuePerShare : null;
  const roe = totalEquity && netProfit ? (netProfit / totalEquity) * 100 : null;
  const roa = totalAssets && netProfit ? (netProfit / totalAssets) * 100 : null;
  const netMargin = revenue && netProfit ? (netProfit / revenue) * 100 : null;

  // --- GROWTH ---
  const growthYears: Array<{ period: string; revenue: number | null; netProfit: number | null; eps: number | null }> = [];
  for (const a of annuals) {
    const d = a.data as Record<string, unknown>;
    const is2 = (d?.incomeStatement || {}) as Record<string, string>;
    growthYears.push({
      period: a.period,
      revenue: parseVal(is2["Total Revenue (Sales/Operating)"]),
      netProfit: parseVal(is2["Net Profit (Loss) Attributable to Shareholders of the Issuer"]),
      eps: parseVal(is2["Profit (Loss) per Share"]),
    });
  }

  let earningsGrowth: number | null = null;
  if (growthYears.length >= 2 && growthYears[0].netProfit && growthYears[1].netProfit && growthYears[1].netProfit > 0) {
    earningsGrowth = ((growthYears[0].netProfit - growthYears[1].netProfit) / growthYears[1].netProfit) * 100;
  }

  const peg = pe && earningsGrowth && earningsGrowth > 0 ? pe / earningsGrowth : null;

  // --- DIVIDENDS ---
  const recentDivs = dividends.slice(0, 4);
  const annualDividend = recentDivs.reduce((sum, d) => {
    const amt = parseFloat((d.dividendAmount || "0").replace(/[^0-9.]/g, ""));
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);
  // If we have 2 semi-annual divs, that's the annual; if 4 quarterly, sum them
  const estimatedAnnualDiv = recentDivs.length >= 2 ? annualDividend : annualDividend * 2;
  const dividendYield = currentPrice > 0 ? (estimatedAnnualDiv / currentPrice) * 100 : null;

  // --- PRICE PERFORMANCE ---
  const priceNow = prices[0]?.close || currentPrice;
  const price1YAgo = prices.find((p) => p.date <= new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split("T")[0])?.close;
  const price3YAgo = prices.find((p) => p.date <= new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split("T")[0])?.close;
  const return1Y = price1YAgo ? ((priceNow - price1YAgo) / price1YAgo) * 100 : null;
  const return3Y = price3YAgo ? ((priceNow - price3YAgo) / price3YAgo) * 100 : null;
  const week52Position = week52High !== week52Low ? ((currentPrice - week52Low) / (week52High - week52Low)) * 100 : 50;

  // --- RATING ---
  let score = 0;
  let signals: string[] = [];

  // Valuation
  if (pe && pe < 12) { score += 2; signals.push("Attractive P/E below 12x"); }
  else if (pe && pe < 18) { score += 1; signals.push("Reasonable P/E"); }
  else if (pe && pe >= 25) { score -= 1; signals.push("Elevated P/E above 25x"); }

  if (peg && peg < 1) { score += 2; signals.push(`PEG ratio of ${peg.toFixed(2)} suggests undervaluation relative to growth`); }

  if (pb && pb < 1.5) { score += 1; signals.push("P/B below 1.5x — reasonable valuation"); }
  else if (pb && pb > 3) { score -= 1; signals.push("P/B above 3x — premium valuation"); }

  // Growth
  if (earningsGrowth && earningsGrowth > 15) { score += 2; signals.push(`Strong earnings growth of ${earningsGrowth.toFixed(1)}%`); }
  else if (earningsGrowth && earningsGrowth > 5) { score += 1; signals.push(`Moderate earnings growth of ${earningsGrowth.toFixed(1)}%`); }
  else if (earningsGrowth && earningsGrowth < 0) { score -= 1; signals.push("Declining earnings"); }

  // Profitability
  if (roe && roe > 15) { score += 1; signals.push(`High ROE of ${roe.toFixed(1)}%`); }
  if (netMargin && netMargin > 30) { score += 1; signals.push(`Strong net margin of ${netMargin.toFixed(1)}%`); }

  // Dividends
  if (dividendYield && dividendYield > 4) { score += 1; signals.push(`Attractive dividend yield of ${dividendYield.toFixed(1)}%`); }
  if (dividendYield && dividendYield > 2) { score += 1; signals.push("Consistent dividend payer"); }

  // Momentum
  if (return1Y && return1Y > 20) { score += 1; signals.push(`Strong 1Y momentum (+${return1Y.toFixed(1)}%)`); }
  if (week52Position > 70) { signals.push("Trading near 52-week high — positive trend"); }
  if (week52Position < 30) { score -= 1; signals.push("Trading near 52-week low — weakness"); }

  let rating: string;
  let ratingColor: string;
  if (score >= 6) { rating = "Strong Buy"; ratingColor = "green"; }
  else if (score >= 4) { rating = "Buy"; ratingColor = "green"; }
  else if (score >= 2) { rating = "Accumulate"; ratingColor = "lime"; }
  else if (score >= 0) { rating = "Hold"; ratingColor = "yellow"; }
  else if (score >= -2) { rating = "Reduce"; ratingColor = "orange"; }
  else { rating = "Sell"; ratingColor = "red"; }

  // Target price
  const targetPE = pe && pe < 15 ? pe + 2 : pe ? pe : 15;
  const targetPrice = eps ? eps * targetPE : currentPrice * 1.1;
  const upside = ((targetPrice - currentPrice) / currentPrice) * 100;
  const totalReturnPotential = upside + (dividendYield || 0);

  // Risks
  const risks: string[] = [];
  if (pe && pe > 20) risks.push("Elevated valuation leaves limited margin of safety");
  if (earningsGrowth && earningsGrowth < 0) risks.push("Declining earnings trend is concerning");
  if (week52Position > 85) risks.push("Trading very close to 52-week high — potential pullback risk");
  if (totalLiabilities && totalAssets && (totalLiabilities / totalAssets) > 0.85) risks.push("High leverage ratio — balance sheet risk");
  risks.push("Sector-specific risks and macroeconomic factors may impact performance");
  risks.push("Past performance does not guarantee future results");

  return NextResponse.json({
    symbol,
    companyName: latestStock.companyName,
    currentPrice,
    valuation: {
      pe, pb, eps, bookValuePerShare, peg,
      week52High, week52Low, week52Position,
    },
    profitability: {
      revenue, netProfit, netMargin, roe, roa,
      unit: (latestAnnual as Record<string, unknown>)?.unit || "Thousands",
    },
    growth: { growthYears, earningsGrowth },
    dividends: {
      recentDividends: recentDivs.map((d) => ({
        date: d.announcedDate,
        amount: d.dividendAmount?.replace("^", ""),
      })),
      estimatedAnnualDiv,
      dividendYield,
    },
    pricePerformance: { return1Y, return3Y, priceNow, price1YAgo, price3YAgo },
    rating: { score, rating, ratingColor, signals },
    target: { targetPrice: Math.round(targetPrice * 100) / 100, upside, totalReturnPotential },
    risks,
  });
}
