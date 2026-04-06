import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeMarketData } from "@/lib/scraper";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  // Rate limit: check if a scrape ran in the last 30 seconds
  const recentSession = await prisma.scrapeSession.findFirst({
    where: {
      startedAt: { gte: new Date(Date.now() - 30000) },
    },
    orderBy: { startedAt: "desc" },
  });

  if (recentSession) {
    return NextResponse.json(
      { error: "A scrape was triggered less than 30 seconds ago. Please wait." },
      { status: 429 }
    );
  }

  const session = await prisma.scrapeSession.create({ data: {} });

  try {
    const result = await scrapeMarketData();

    if (!result.success) {
      await prisma.scrapeSession.update({
        where: { id: session.id },
        data: { status: "failed", error: result.error, finishedAt: new Date() },
      });
      return NextResponse.json({ error: result.error, sessionId: session.id }, { status: 500 });
    }

    // Bulk insert records
    await prisma.stockRecord.createMany({
      data: result.records.map((r) => ({
        sessionId: session.id,
        ...r,
      })),
    });

    await prisma.scrapeSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
        rowCount: result.records.length,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      rowCount: result.records.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.scrapeSession.update({
      where: { id: session.id },
      data: { status: "failed", error: message, finishedAt: new Date() },
    });
    return NextResponse.json({ error: message, sessionId: session.id }, { status: 500 });
  }
}
