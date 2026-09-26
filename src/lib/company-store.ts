import { prisma } from "./db";
import type { CompanyProfileData } from "./company-scraper";

export interface StoreCounts {
  created: boolean;
  announcements: number;
  dividends: number;
  boardMembers: number;
  corporateActions: number;
  financials: number;
}

// Persist scraped company data additively: upsert the profile, insert only
// child rows whose natural key is not already present (never delete), and
// upsert financial statements on (symbol, period, type). Safe to re-run.
export async function storeCompanyData(
  data: CompanyProfileData
): Promise<StoreCounts> {
  const symbol = data.symbol;
  const stock = await prisma.stockRecord.findFirst({
    where: { symbol },
    orderBy: { scrapedAt: "desc" },
    select: { companyName: true },
  });
  const companyName = data.companyName || stock?.companyName || symbol;

  const existing = await prisma.companyProfile.findUnique({ where: { symbol } });
  const profile = await prisma.companyProfile.upsert({
    where: { symbol },
    update: {
      companyName,
      // Only overwrite sector/details when we actually scraped them.
      ...(data.sector ? { sector: data.sector } : {}),
      ...(data.details && Object.keys(data.details).length
        ? { details: JSON.stringify(data.details) }
        : {}),
      scrapedAt: new Date(),
    },
    create: {
      symbol,
      companyName,
      sector: data.sector,
      details: data.details ? JSON.stringify(data.details) : null,
    },
  });
  const profileId = profile.id;

  const counts: StoreCounts = {
    created: !existing,
    announcements: 0,
    dividends: 0,
    boardMembers: 0,
    corporateActions: 0,
    financials: 0,
  };

  // Announcements — key on title + date.
  {
    const rows = await prisma.announcement.findMany({
      where: { profileId },
      select: { title: true, date: true },
    });
    const seen = new Set(rows.map((r) => `${r.title}|${r.date ?? ""}`));
    const toAdd = data.announcements.filter((a) => {
      const k = `${a.title}|${a.date ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (toAdd.length) {
      await prisma.announcement.createMany({
        data: toAdd.map((a) => ({ profileId, ...a })),
      });
      counts.announcements = toAdd.length;
    }
  }

  // Dividends — key on the announced/eligibility/distribution dates + amount.
  {
    const rows = await prisma.dividend.findMany({
      where: { profileId },
      select: {
        announcedDate: true,
        eligibilityDate: true,
        distributionDate: true,
        dividendAmount: true,
      },
    });
    const key = (d: {
      announcedDate: string | null;
      eligibilityDate: string | null;
      distributionDate: string | null;
      dividendAmount: string | null;
    }) =>
      `${d.announcedDate ?? ""}|${d.eligibilityDate ?? ""}|${d.distributionDate ?? ""}|${d.dividendAmount ?? ""}`;
    const seen = new Set(rows.map(key));
    const toAdd = data.dividends.filter((d) => {
      const k = key(d);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (toAdd.length) {
      await prisma.dividend.createMany({
        data: toAdd.map((d) => ({ profileId, ...d })),
      });
      counts.dividends = toAdd.length;
    }
  }

  // Corporate actions — key on title + date.
  {
    const rows = await prisma.corporateAction.findMany({
      where: { profileId },
      select: { title: true, date: true },
    });
    const seen = new Set(rows.map((r) => `${r.title}|${r.date ?? ""}`));
    const toAdd = data.corporateActions.filter((c) => {
      const k = `${c.title}|${c.date ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (toAdd.length) {
      await prisma.corporateAction.createMany({
        data: toAdd.map((c) => ({ profileId, ...c })),
      });
      counts.corporateActions = toAdd.length;
    }
  }

  // Board / shareholding — key on the whole snapshot row.
  {
    const rows = await prisma.boardMember.findMany({
      where: { profileId },
      select: {
        tradingDate: true,
        shareholder: true,
        designation: true,
        sharesHeld: true,
      },
    });
    const key = (b: {
      tradingDate: string | null;
      shareholder: string | null;
      designation: string | null;
      sharesHeld: string | null;
    }) =>
      `${b.tradingDate ?? ""}|${b.shareholder ?? ""}|${b.designation ?? ""}|${b.sharesHeld ?? ""}`;
    const seen = new Set(rows.map(key));
    const toAdd = data.boardMembers.filter((b) => {
      const k = key(b);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (toAdd.length) {
      await prisma.boardMember.createMany({
        data: toAdd.map((b) => ({ profileId, ...b })),
      });
      counts.boardMembers = toAdd.length;
    }
  }

  // Financial statements — upsert on (symbol, period, type).
  for (const f of data.financials) {
    await prisma.financialStatement.upsert({
      where: { symbol_period_type: { symbol, period: f.period, type: f.type } },
      update: { data: JSON.stringify(f.data), scrapedAt: new Date() },
      create: { symbol, period: f.period, type: f.type, data: JSON.stringify(f.data) },
    });
    counts.financials++;
  }

  return counts;
}
