import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeCompanyProfile } from "@/lib/company-scraper";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }

  try {
    const data = await scrapeCompanyProfile(symbol);

    // Get sector from existing stock records
    const stockRecord = await prisma.stockRecord.findFirst({
      where: { symbol },
      orderBy: { scrapedAt: "desc" },
      select: { companyName: true },
    });

    // Upsert the company profile
    const existing = await prisma.companyProfile.findUnique({ where: { symbol } });

    if (existing) {
      // Delete old related records
      await Promise.all([
        prisma.announcement.deleteMany({ where: { profileId: existing.id } }),
        prisma.dividend.deleteMany({ where: { profileId: existing.id } }),
        prisma.boardMember.deleteMany({ where: { profileId: existing.id } }),
        prisma.corporateAction.deleteMany({ where: { profileId: existing.id } }),
      ]);

      // Update profile
      await prisma.companyProfile.update({
        where: { symbol },
        data: {
          companyName: data.companyName || stockRecord?.companyName || symbol,
          sector: data.sector,
          details: data.details,
          scrapedAt: new Date(),
        },
      });

      // Insert new related records
      if (data.announcements.length > 0) {
        await prisma.announcement.createMany({
          data: data.announcements.map((a) => ({ profileId: existing.id, ...a })),
        });
      }
      if (data.dividends.length > 0) {
        await prisma.dividend.createMany({
          data: data.dividends.map((d) => ({ profileId: existing.id, ...d })),
        });
      }
      if (data.boardMembers.length > 0) {
        await prisma.boardMember.createMany({
          data: data.boardMembers.map((b) => ({ profileId: existing.id, ...b })),
        });
      }
      if (data.corporateActions.length > 0) {
        await prisma.corporateAction.createMany({
          data: data.corporateActions.map((c) => ({ profileId: existing.id, ...c })),
        });
      }

      return NextResponse.json({ success: true, symbol, updated: true });
    }

    // Create new profile with all related data
    await prisma.companyProfile.create({
      data: {
        symbol,
        companyName: data.companyName || stockRecord?.companyName || symbol,
        sector: data.sector,
        details: data.details,
        announcements: { create: data.announcements },
        dividends: { create: data.dividends },
        boardMembers: { create: data.boardMembers },
        corporateActions: { create: data.corporateActions },
      },
    });

    return NextResponse.json({ success: true, symbol, updated: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
