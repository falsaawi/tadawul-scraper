import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeMarketData } from "@/lib/scraper";
import { isTradingHours } from "@/lib/trading-hours";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Check trading hours
  if (!isTradingHours()) {
    return NextResponse.json({ message: "Outside trading hours, skipping scrape" });
  }

  const session = await prisma.scrapeSession.create({ data: {} });

  try {
    const result = await scrapeMarketData();

    if (!result.success) {
      await prisma.scrapeSession.update({
        where: { id: session.id },
        data: { status: "failed", error: result.error, finishedAt: new Date() },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
