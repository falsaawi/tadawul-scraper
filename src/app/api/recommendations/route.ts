import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseVal(v: string | undefined | null): number | null {
  if (!v || v === "-") return null;
  const n = parseFloat(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

interface Assessment {
  symbol: string;
  companyName: string;
  sector: string | null;
  currentPrice: number;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  peg: number | null;
  netMargin: number | null;
  roe: number | null;
  earningsGrowth: number | null;
  return1Y: number | null;
  dividendYield: number | null;
  week52Position: number;
  score: number;
  rating: string;
  ratingColor: string;
  targetPrice: number;
  upside: number;
  totalReturnPotential: number;
}

const SECTOR_MAP: Record<string, string> = {};
const SECTORS_DATA: Record<string, string[]> = {
  "Energy": ["2030","2222","2380","2381","2382","4030"],
  "Materials": ["1201","1202","1210","1211","1301","1304","1320","1321","1322","1323","1324","2001","2010","2020","2060","2090","2150","2170","2180","2200","2210","2220","2223","2240","2250","2290","2300","2310","2330","2350","2360","3002","3003","3004","3005","3007","3008","3010","3020","3030","3040","3050","3060","3080","3090","3091","3092","4143"],
  "Capital Goods": ["1212","1214","1302","1303","2040","2110","2160","2320","2370","4110","4140","4141","4142","4144","4145","4146","4147","4148"],
  "Commercial & Professional Svc": ["1831","1832","1833","1834","1835","4270","6004"],
  "Transportation": ["2190","4031","4040","4260","4261","4262","4263","4264","4265"],
  "Consumer Durables & Apparel": ["1213","2130","2340","4011","4012","4180"],
  "Consumer Services": ["1810","1820","1830","4170","4290","4291","4292","6002","6012","6013","6014","6015","6016","6017","6018","6019"],
  "Media and Entertainment": ["4070","4071","4072","4210"],
  "Consumer Discretionary Distribution & Retail": ["4003","4008","4050","4051","4190","4191","4192","4193","4194","4200","4240"],
  "Consumer Staples Distribution & Retail": ["4001","4006","4061","4160","4161","4162","4163","4164"],
  "Food & Beverages": ["2050","2100","2270","2280","2281","2282","2283","2284","2285","2286","2287","2288","4080","6001","6010","6020","6040","6050","6060","6070","6090"],
  "Household & Personal Products": ["4165"],
  "Health Care Equipment & Svc": ["2140","2230","4002","4004","4005","4007","4009","4013","4014","4017","4018","4019","4021"],
  "Pharma, Biotech & Life Science": ["2070","4015","4016"],
  "Banks": ["1010","1020","1030","1050","1060","1080","1120","1140","1150","1180"],
  "Financial Services": ["1111","1182","1183","2120","4081","4082","4083","4084","4130","4280"],
  "Insurance": ["8010","8012","8020","8030","8040","8050","8060","8070","8100","8120","8150","8160","8170","8180","8190","8200","8210","8230","8240","8250","8260","8280","8300","8310","8311","8313"],
  "Software & Services": ["7200","7201","7202","7203","7204","7211"],
  "Telecommunication Services": ["7010","7020","7030","7040"],
  "Utilities": ["2080","2081","2082","2083","2084","5110"],
  "REITs": ["4330","4331","4332","4333","4334","4335","4336","4337","4338","4339","4340","4342","4344","4345","4346","4347","4348","4349","4350"],
  "Real Estate Mgmt & Dev't": ["4020","4090","4100","4150","4220","4230","4250","4300","4310","4320","4321","4322","4323","4324","4325","4326","4327"],
};
for (const [sector, syms] of Object.entries(SECTORS_DATA)) {
  for (const s of syms) SECTOR_MAP[s] = sector;
}

export async function GET() {
  // 1. Get latest stock record per symbol from latest completed session
  const lastSession = await prisma.scrapeSession.findFirst({
    where: { status: "completed" },
    orderBy: { startedAt: "desc" },
  });
  if (!lastSession) return NextResponse.json({ assessments: [] });

  const stocks = await prisma.stockRecord.findMany({
    where: { sessionId: lastSession.id },
  });
  const stockMap = new Map<string, typeof stocks[0]>();
  for (const s of stocks) stockMap.set(s.symbol, s);

  // 2. Get all annual financial statements (most recent 2 per symbol)
  const allFinancials = await prisma.financialStatement.findMany({
    where: { type: "annual" },
    orderBy: [{ symbol: "asc" }, { period: "desc" }],
  });
  const financialsMap = new Map<string, typeof allFinancials>();
  for (const f of allFinancials) {
    if (!financialsMap.has(f.symbol)) financialsMap.set(f.symbol, []);
    financialsMap.get(f.symbol)!.push(f);
  }

  // 3. Get historical prices: only need 1Y old close per symbol
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0];
  const oldPrices = await prisma.$queryRaw<Array<{ symbol: string; close: number | null }>>`
    SELECT DISTINCT ON (symbol) symbol, close FROM "HistoricalPrice"
    WHERE date <= ${oneYearAgoStr}
    ORDER BY symbol, date DESC
  `;
  const oldPriceMap = new Map<string, number>();
  for (const p of oldPrices) if (p.close != null) oldPriceMap.set(p.symbol, p.close);

  // 4. Get dividends per symbol
  const allDivs = await prisma.dividend.findMany({
    include: { profile: { select: { symbol: true } } },
    orderBy: { announcedDate: "desc" },
  });
  const divsMap = new Map<string, Array<{ amount: string | null }>>();
  for (const d of allDivs) {
    const sym = d.profile?.symbol;
    if (!sym) continue;
    if (!divsMap.has(sym)) divsMap.set(sym, []);
    divsMap.get(sym)!.push({ amount: d.dividendAmount });
  }

  // 5. Compute assessments
  const assessments: Assessment[] = [];
  for (const [symbol, stock] of stockMap) {
    const fins = financialsMap.get(symbol) || [];
    const latest = fins[0];
    if (!latest) continue;

    const data = latest.data as Record<string, unknown>;
    const isData = (data?.incomeStatement || {}) as Record<string, string>;
    const bsData = (data?.balanceSheet || {}) as Record<string, string>;

    const eps = parseVal(isData["Profit (Loss) per Share"]);
    const totalEquity = parseVal(bsData["Total Shareholders Equity (After Deducting the Minority Equity)"] || bsData["Shareholders Equity"]);
    const totalAssets = parseVal(bsData["Total Assets"]);
    const revenue = parseVal(isData["Total Revenue (Sales/Operating)"]);
    const netProfit = parseVal(isData["Net Profit (Loss) Attributable to Shareholders of the Issuer"]);

    const currentPrice = stock.lastTradePrice || 0;
    const pe = eps && eps > 0 ? currentPrice / eps : null;
    const sharesEst = eps && netProfit ? (netProfit * 1000) / eps : null;
    const bookVal = totalEquity && sharesEst ? (totalEquity * 1000) / sharesEst : null;
    const pb = bookVal ? currentPrice / bookVal : null;
    const roe = totalEquity && netProfit ? (netProfit / totalEquity) * 100 : null;
    const netMargin = revenue && netProfit ? (netProfit / revenue) * 100 : null;

    let earningsGrowth: number | null = null;
    if (fins.length >= 2) {
      const prevData = fins[1].data as Record<string, unknown>;
      const prevIs = (prevData?.incomeStatement || {}) as Record<string, string>;
      const prevNet = parseVal(prevIs["Net Profit (Loss) Attributable to Shareholders of the Issuer"]);
      if (prevNet && prevNet > 0 && netProfit) {
        earningsGrowth = ((netProfit - prevNet) / prevNet) * 100;
      }
    }
    const peg = pe && earningsGrowth && earningsGrowth > 0 ? pe / earningsGrowth : null;

    // Dividend yield (sum of last 2 dividends as estimate)
    const divs = divsMap.get(symbol) || [];
    const lastDivs = divs.slice(0, 2);
    const annualDiv = lastDivs.reduce((sum, d) => {
      const a = parseFloat((d.amount || "0").replace(/[^0-9.]/g, ""));
      return sum + (isNaN(a) ? 0 : a);
    }, 0);
    const dividendYield = currentPrice > 0 && annualDiv > 0 ? (annualDiv / currentPrice) * 100 : null;

    // 1Y return
    const oldPrice = oldPriceMap.get(symbol);
    const return1Y = oldPrice && oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : null;

    // 52W Position
    const w52H = stock.week52High || 0;
    const w52L = stock.week52Low || 0;
    const week52Position = w52H !== w52L ? ((currentPrice - w52L) / (w52H - w52L)) * 100 : 50;

    // Scoring
    let score = 0;
    if (pe && pe < 12) score += 2;
    else if (pe && pe < 18) score += 1;
    else if (pe && pe >= 25) score -= 1;
    if (peg && peg < 1) score += 2;
    if (pb && pb < 1.5) score += 1;
    else if (pb && pb > 3) score -= 1;
    if (earningsGrowth && earningsGrowth > 15) score += 2;
    else if (earningsGrowth && earningsGrowth > 5) score += 1;
    else if (earningsGrowth && earningsGrowth < 0) score -= 1;
    if (roe && roe > 15) score += 1;
    if (netMargin && netMargin > 30) score += 1;
    if (dividendYield && dividendYield > 4) score += 1;
    if (dividendYield && dividendYield > 2) score += 1;
    if (return1Y && return1Y > 20) score += 1;
    if (week52Position < 30) score -= 1;

    let rating: string, ratingColor: string;
    if (score >= 6) { rating = "Strong Buy"; ratingColor = "green"; }
    else if (score >= 4) { rating = "Buy"; ratingColor = "green"; }
    else if (score >= 2) { rating = "Accumulate"; ratingColor = "lime"; }
    else if (score >= 0) { rating = "Hold"; ratingColor = "yellow"; }
    else if (score >= -2) { rating = "Reduce"; ratingColor = "orange"; }
    else { rating = "Sell"; ratingColor = "red"; }

    const targetPE = pe && pe < 15 ? pe + 2 : pe ? pe : 15;
    const targetPrice = eps ? eps * targetPE : currentPrice * 1.1;
    const upside = ((targetPrice - currentPrice) / currentPrice) * 100;
    const totalReturnPotential = upside + (dividendYield || 0);

    assessments.push({
      symbol,
      companyName: stock.companyName,
      sector: SECTOR_MAP[symbol] || null,
      currentPrice,
      pe, pb, eps, peg,
      netMargin, roe,
      earningsGrowth,
      return1Y,
      dividendYield,
      week52Position,
      score,
      rating, ratingColor,
      targetPrice: Math.round(targetPrice * 100) / 100,
      upside,
      totalReturnPotential,
    });
  }

  return NextResponse.json({ assessments, total: assessments.length });
}
