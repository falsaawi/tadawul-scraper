import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const sector = searchParams.get("sector");
  const listOnly = searchParams.get("list") === "true";

  // List mode — return all available companies with sectors
  if (listOnly) {
    const profiles = await prisma.companyProfile.findMany({
      select: { symbol: true, companyName: true, sector: true, scrapedAt: true },
      orderBy: { symbol: "asc" },
    });

    // Also get the full stock list from latest scrape for companies not yet profiled
    const lastSession = await prisma.scrapeSession.findFirst({
      where: { status: "completed" },
      orderBy: { startedAt: "desc" },
    });

    let allStocks: Array<{ symbol: string; companyName: string }> = [];
    if (lastSession) {
      allStocks = await prisma.stockRecord.findMany({
        where: { sessionId: lastSession.id },
        select: { symbol: true, companyName: true },
        orderBy: { symbol: "asc" },
      });
    }

    // Get unique sectors from profiles
    const sectors = [...new Set(profiles.map((p) => p.sector).filter(Boolean))].sort();

    return NextResponse.json({ profiles, allStocks, sectors });
  }

  // Single company mode
  if (symbol) {
    const profile = await prisma.companyProfile.findUnique({
      where: { symbol },
      include: {
        announcements: { orderBy: { date: "desc" } },
        dividends: true,
        boardMembers: true,
        corporateActions: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Company not found. Scrape it first." }, { status: 404 });
    }

    return NextResponse.json(profile);
  }

  // Filter by sector
  if (sector) {
    const profiles = await prisma.companyProfile.findMany({
      where: { sector },
      select: { symbol: true, companyName: true, sector: true, scrapedAt: true },
      orderBy: { symbol: "asc" },
    });
    return NextResponse.json({ profiles });
  }

  return NextResponse.json({ error: "Provide symbol, sector, or list=true parameter" }, { status: 400 });
}
