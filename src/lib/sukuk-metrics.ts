// Deterministic fixed-income metrics for sukuk. Pure functions: the route
// fetches rows from D1 and passes them here; nothing in this file touches the
// DB or an LLM. The analysis agent reasons over these computed numbers.

export interface SukukHistoryPoint {
  date: string; // YYYY-MM-DD
  close: number | null;
  yield: number | null;
  volume: number | null;
  trades: number | null;
}

export interface SukukMetricInput {
  code: string;
  name: string | null;
  isin: string | null;
  couponType: string | null;
  couponRate: number | null; // %
  maturityDate: string | null; // YYYY-MM-DD
  parValue: number | null;
  issuanceAmount: number | null;
  currency: string | null;
  couponFrequency: string | null;
  // latest quote
  lastPrice: number | null;
  instrumentYield: number | null;
  bidYield: number | null;
  askYield: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  // recent history, ascending by date
  history: SukukHistoryPoint[];
}

export interface SukukMetrics {
  code: string;
  name: string | null;
  isGovernment: boolean;
  couponType: string | null;
  couponRate: number | null;
  maturityDate: string | null;
  yearsToMaturity: number | null;
  price: number | null; // last traded / clean price (per 100)
  premiumDiscount: number | null; // price - 100
  currentYield: number | null; // %
  ytmApprox: number | null; // %
  marketYield: number | null; // site-reported yield, preferred
  bidAskSpreadBps: number | null; // yield bid/ask spread in bps
  avgVolume30: number | null;
  avgTrades30: number | null;
  tradingDaysLast30: number;
  liquidity: "liquid" | "thin" | "illiquid" | "untraded";
  yieldChange30dBps: number | null;
  yieldChange90dBps: number | null;
  // relative (filled in the universe pass)
  spreadVsGovtBps: number | null;
  yieldPercentile: number | null; // 0-100 across the universe (higher yield -> higher)
}

function yearsBetween(fromISO: string, toISO: string): number | null {
  const a = new Date(fromISO).getTime();
  const b = new Date(toISO).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return (b - a) / (365.25 * 24 * 3600 * 1000);
}

function round(n: number | null, dp = 4): number | null {
  if (n === null || n === undefined || isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Approximate yield to maturity for a bond priced at P (per 100 of par),
// annual coupon c% , n years to maturity: [c + (100-P)/n] / [(100+P)/2].
function ytmApprox(
  price: number | null,
  couponRate: number | null,
  years: number | null
): number | null {
  if (price === null || couponRate === null || !years || years <= 0)
    return null;
  const num = couponRate + (100 - price) / years;
  const den = (100 + price) / 2;
  if (den === 0) return null;
  return (num / den) * 100;
}

const GOVT_RE = /ksa sukuk|government|saudi gov|gov'?t/i;

export function computeBaseMetrics(
  input: SukukMetricInput,
  todayISO: string
): SukukMetrics {
  const price = input.lastPrice;
  const years =
    input.maturityDate != null
      ? yearsBetween(todayISO, input.maturityDate)
      : null;

  const currentYield =
    price && price > 0 && input.couponRate != null
      ? (input.couponRate / price) * 100
      : null;

  const ytm = ytmApprox(price, input.couponRate, years);
  const marketYield = input.instrumentYield ?? ytm ?? currentYield;

  const bidAskSpreadBps =
    input.askYield != null && input.bidYield != null
      ? (input.askYield - input.bidYield) * 100
      : null;

  // Liquidity from the last 30 history points.
  const last30 = input.history.slice(-30);
  const traded = last30.filter((h) => (h.volume ?? 0) > 0);
  const avgVolume30 = traded.length
    ? traded.reduce((s, h) => s + (h.volume ?? 0), 0) / traded.length
    : null;
  const avgTrades30 = traded.length
    ? traded.reduce((s, h) => s + (h.trades ?? 0), 0) / traded.length
    : null;
  const tradingDaysLast30 = traded.length;
  let liquidity: SukukMetrics["liquidity"] = "untraded";
  if (tradingDaysLast30 >= 15) liquidity = "liquid";
  else if (tradingDaysLast30 >= 5) liquidity = "thin";
  else if (tradingDaysLast30 >= 1) liquidity = "illiquid";

  // Yield trend: compare latest yield to the yield ~30 / ~90 points earlier.
  const withY = input.history.filter((h) => h.yield != null);
  const latestY = withY.length ? withY[withY.length - 1].yield! : null;
  const yAt = (back: number): number | null => {
    if (withY.length <= back) return null;
    return withY[withY.length - 1 - back].yield ?? null;
  };
  const y30 = yAt(30);
  const y90 = yAt(90);
  const yieldChange30dBps =
    latestY != null && y30 != null ? (latestY - y30) * 100 : null;
  const yieldChange90dBps =
    latestY != null && y90 != null ? (latestY - y90) * 100 : null;

  return {
    code: input.code,
    name: input.name,
    isGovernment: input.name ? GOVT_RE.test(input.name) : false,
    couponType: input.couponType,
    couponRate: round(input.couponRate),
    maturityDate: input.maturityDate,
    yearsToMaturity: round(years, 2),
    price: round(price),
    premiumDiscount: price != null ? round(price - 100, 3) : null,
    currentYield: round(currentYield),
    ytmApprox: round(ytm),
    marketYield: round(marketYield),
    bidAskSpreadBps: round(bidAskSpreadBps, 1),
    avgVolume30: round(avgVolume30, 0),
    avgTrades30: round(avgTrades30, 1),
    tradingDaysLast30,
    liquidity,
    yieldChange30dBps: round(yieldChange30dBps, 1),
    yieldChange90dBps: round(yieldChange90dBps, 1),
    spreadVsGovtBps: null,
    yieldPercentile: null,
  };
}

// Linear interpolation of the government yield curve at a given maturity.
function interpGovtYield(
  govt: Array<{ years: number; yield: number }>,
  years: number
): number | null {
  if (govt.length === 0) return null;
  const pts = [...govt].sort((a, b) => a.years - b.years);
  if (years <= pts[0].years) return pts[0].yield;
  if (years >= pts[pts.length - 1].years) return pts[pts.length - 1].yield;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (years >= a.years && years <= b.years) {
      const t = (years - a.years) / (b.years - a.years);
      return a.yield + t * (b.yield - a.yield);
    }
  }
  return null;
}

// Second pass: fill relative metrics (govt spread, yield percentile) across
// the whole universe.
export function fillRelativeMetrics(all: SukukMetrics[]): SukukMetrics[] {
  const govtCurve = all
    .filter(
      (m) =>
        m.isGovernment && m.yearsToMaturity != null && m.marketYield != null
    )
    .map((m) => ({ years: m.yearsToMaturity!, yield: m.marketYield! }));

  const yields = all
    .filter((m) => m.marketYield != null)
    .map((m) => m.marketYield!)
    .sort((a, b) => a - b);

  for (const m of all) {
    if (m.yearsToMaturity != null && m.marketYield != null && govtCurve.length) {
      const g = interpGovtYield(govtCurve, m.yearsToMaturity);
      m.spreadVsGovtBps = g != null ? round((m.marketYield - g) * 100, 1) : null;
    }
    if (m.marketYield != null && yields.length > 1) {
      const below = yields.filter((y) => y < m.marketYield!).length;
      m.yieldPercentile = Math.round((below / (yields.length - 1)) * 100);
    }
  }
  return all;
}
