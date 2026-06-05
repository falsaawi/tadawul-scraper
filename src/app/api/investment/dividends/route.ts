import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildMappingIndex,
  resolveSymbol,
  type CandidateName,
} from "@/lib/dividend-mapping";
import { SAUDI_NAME_DICTIONARY } from "@/lib/saudi-name-dictionary";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filterYearRaw = searchParams.get("year");
  const filterMonthRaw = searchParams.get("month");
  const filterYear = filterYearRaw && filterYearRaw !== "all" ? parseInt(filterYearRaw) : null;
  const filterMonth = filterMonthRaw && filterMonthRaw !== "all" ? parseInt(filterMonthRaw) : null;
  const upload = await prisma.dividendUpload.findFirst({
    orderBy: { uploadedAt: "desc" },
  });

  if (!upload) {
    return NextResponse.json({ upload: null });
  }

  const allDividends = await prisma.dividendPayment.findMany({
    where: { uploadId: upload.id },
    orderBy: { distDate: "desc" },
  });

  // ---- Build the name -> symbol mapping from all sources we have ----
  // Curated Arabic dictionary first so it wins exact matches against the
  // broker's Arabic names (the scraper only stores English names).
  const candidates: CandidateName[] = [...SAUDI_NAME_DICTIONARY];
  const lastSession = await prisma.scrapeSession.findFirst({
    where: { status: "completed" },
    orderBy: { startedAt: "desc" },
  });
  const nameBySymbol = new Map<string, string>();
  if (lastSession) {
    const records = await prisma.stockRecord.findMany({
      where: { sessionId: lastSession.id },
      select: { symbol: true, companyName: true },
    });
    for (const r of records) {
      candidates.push({ symbol: r.symbol, name: r.companyName });
      if (!nameBySymbol.has(r.symbol)) nameBySymbol.set(r.symbol, r.companyName);
    }
  }
  const lastInvUpload = await prisma.investmentUpload.findFirst({
    orderBy: { uploadedAt: "desc" },
  });
  const holdingCostBySymbol = new Map<string, number>();
  if (lastInvUpload) {
    const holdings = await prisma.investmentSaudiStock.findMany({
      where: { uploadId: lastInvUpload.id },
    });
    for (const h of holdings) {
      if (h.companyName) candidates.push({ symbol: h.stockCode, name: h.companyName });
      if (h.totalCost != null) {
        holdingCostBySymbol.set(
          h.stockCode,
          (holdingCostBySymbol.get(h.stockCode) ?? 0) + h.totalCost
        );
      }
      if (!nameBySymbol.has(h.stockCode) && h.companyName) {
        nameBySymbol.set(h.stockCode, h.companyName);
      }
    }
  }
  const profiles = await prisma.companyProfile.findMany({
    select: { symbol: true, companyName: true },
  });
  for (const p of profiles) {
    candidates.push({ symbol: p.symbol, name: p.companyName });
    if (!nameBySymbol.has(p.symbol)) nameBySymbol.set(p.symbol, p.companyName);
  }
  const index = buildMappingIndex(candidates);

  // Manual overrides win over everything else.
  const overrides = new Map<string, string>();
  for (const m of await prisma.dividendSymbolMap.findMany()) {
    overrides.set(m.company, m.symbol);
  }

  // Resolve each payment's symbol on the fly (keeps analysis fresh)
  for (const d of allDividends) {
    const override = overrides.get(d.company);
    if (override) {
      d.symbol = override;
      continue;
    }
    const resolved = resolveSymbol(d.company, index);
    if (resolved) d.symbol = resolved;
  }

  // Build the list of years available for the year filter from the
  // unfiltered set so users can always navigate to a different year.
  const availableYearsSet = new Set<number>();
  for (const d of allDividends) {
    if (d.distDate) availableYearsSet.add(d.distDate.getUTCFullYear());
  }
  const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

  // Apply page-wide filters (year / month) before aggregation.
  const dividends = allDividends.filter((d) => {
    if (filterYear == null && filterMonth == null) return true;
    if (!d.distDate) return false;
    if (filterYear != null && d.distDate.getUTCFullYear() !== filterYear) return false;
    if (filterMonth != null && d.distDate.getUTCMonth() + 1 !== filterMonth) return false;
    return true;
  });

  // Per-company yearly history (unfiltered) — fuels the sparkline popover in
  // the mapping table, so the trend stays visible even when the page is
  // filtered to a single year/month.
  const companyByYear = new Map<string, Map<number, number>>();
  for (const d of allDividends) {
    if (!d.distDate) continue;
    const y = d.distDate.getUTCFullYear();
    const yearMap = companyByYear.get(d.company) ?? new Map<number, number>();
    yearMap.set(y, (yearMap.get(y) ?? 0) + d.value);
    companyByYear.set(d.company, yearMap);
  }

  // ---- Aggregations ----
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const ytStart = new Date(Date.UTC(thisYear, 0, 1));
  const lyStart = new Date(Date.UTC(thisYear - 1, 0, 1));
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cutoff12mo = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate())
  );

  let lifetime = 0,
    yearToDate = 0,
    lastYear = 0,
    last30 = 0,
    last12mo = 0,
    matched = 0;
  let firstDate: Date | null = null;
  let lastDate: Date | null = null;

  const byYear = new Map<number, { value: number; count: number }>();
  const byMonth = new Map<number, { value: number; count: number }>();
  const byStatus = new Map<string, { value: number; count: number }>();
  const byType = new Map<string, { value: number; count: number }>();
  const byCompany = new Map<
    string,
    { value: number; count: number; symbol: string | null }
  >();

  for (const d of dividends) {
    lifetime += d.value;
    if (d.symbol) matched++;
    const dt = d.distDate;
    if (dt) {
      if (!firstDate || dt < firstDate) firstDate = dt;
      if (!lastDate || dt > lastDate) lastDate = dt;
      if (dt >= ytStart) yearToDate += d.value;
      if (dt >= lyStart && dt < ytStart) lastYear += d.value;
      if (dt >= cutoff30) last30 += d.value;
      if (dt >= cutoff12mo) last12mo += d.value;
      const y = dt.getUTCFullYear();
      const yc = byYear.get(y) ?? { value: 0, count: 0 };
      yc.value += d.value;
      yc.count += 1;
      byYear.set(y, yc);
      const m = dt.getUTCMonth();
      const mc = byMonth.get(m) ?? { value: 0, count: 0 };
      mc.value += d.value;
      mc.count += 1;
      byMonth.set(m, mc);
    }
    const st = (d.status ?? "—").trim() || "—";
    const sc = byStatus.get(st) ?? { value: 0, count: 0 };
    sc.value += d.value;
    sc.count += 1;
    byStatus.set(st, sc);
    const tp = (d.type ?? "—").trim() || "—";
    const tc = byType.get(tp) ?? { value: 0, count: 0 };
    tc.value += d.value;
    tc.count += 1;
    byType.set(tp, tc);
    const cc = byCompany.get(d.company) ?? { value: 0, count: 0, symbol: d.symbol };
    cc.value += d.value;
    cc.count += 1;
    if (!cc.symbol && d.symbol) cc.symbol = d.symbol;
    byCompany.set(d.company, cc);
  }

  const byYearArr = Array.from(byYear.entries())
    .map(([year, v]) => ({ year, value: v.value, count: v.count }))
    .sort((a, b) => a.year - b.year);

  // cumulative over years
  let running = 0;
  const cumulative = byYearArr.map((y) => {
    running += y.value;
    return { year: y.year, cumulative: running, value: y.value };
  });

  const byMonthArr = Array.from({ length: 12 }, (_, m) => {
    const v = byMonth.get(m) ?? { value: 0, count: 0 };
    return { month: m + 1, label: MONTHS[m], value: v.value, count: v.count };
  });

  const yearsSpan =
    firstDate && lastDate
      ? lastDate.getUTCFullYear() - firstDate.getUTCFullYear() + 1
      : 0;

  // Company table with resolved symbol + yield on cost where available
  const companies = Array.from(byCompany.entries())
    .map(([company, v]) => {
      const cost = v.symbol ? holdingCostBySymbol.get(v.symbol) ?? null : null;
      const yieldOnCostPct =
        cost != null && cost > 0 ? (v.value / cost) * 100 : null;
      const yearMap = companyByYear.get(company) ?? new Map<number, number>();
      const history = Array.from(yearMap.entries())
        .map(([year, value]) => ({ year, value }))
        .sort((a, b) => a.year - b.year);
      return {
        company,
        symbol: v.symbol,
        companyName: v.symbol ? nameBySymbol.get(v.symbol) ?? null : null,
        value: v.value,
        count: v.count,
        cost,
        yieldOnCostPct,
        history,
      };
    })
    .sort((a, b) => b.value - a.value);

  const matchedCompanies = companies.filter((c) => c.symbol).length;

  return NextResponse.json({
    upload: {
      id: upload.id,
      fileName: upload.fileName,
      uploadedAt: upload.uploadedAt,
      rowCount: upload.rowCount,
    },
    filters: {
      year: filterYear,
      month: filterMonth,
    },
    availableYears,
    summary: {
      lifetime,
      yearToDate,
      lastYear,
      last30Days: last30,
      last12Months: last12mo,
      count: dividends.length,
      distinctCompanies: byCompany.size,
      matched,
      unmatched: dividends.length - matched,
      coverage: dividends.length > 0 ? (matched / dividends.length) * 100 : 0,
      matchedCompanies,
      unmatchedCompanies: byCompany.size - matchedCompanies,
      avgPerYear: yearsSpan > 0 ? lifetime / yearsSpan : 0,
      firstDate,
      lastDate,
      yearsSpan,
    },
    byYear: byYearArr,
    cumulative,
    byMonth: byMonthArr,
    byStatus: Array.from(byStatus.entries())
      .map(([status, v]) => ({ status, value: v.value, count: v.count }))
      .sort((a, b) => b.value - a.value),
    byType: Array.from(byType.entries())
      .map(([type, v]) => ({ type, value: v.value, count: v.count }))
      .sort((a, b) => b.value - a.value),
    companies,
    topYielders: companies
      .filter((c) => c.yieldOnCostPct != null)
      .sort((a, b) => (b.yieldOnCostPct ?? 0) - (a.yieldOnCostPct ?? 0))
      .slice(0, 10),
    recent: dividends.slice(0, 20).map((d) => ({
      id: d.id,
      company: d.company,
      symbol: d.symbol,
      value: d.value,
      perShare: d.perShare,
      units: d.units,
      distDate: d.distDate,
      status: d.status,
      type: d.type,
    })),
  });
}
