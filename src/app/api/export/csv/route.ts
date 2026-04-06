import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const CSV_HEADERS = [
  "Scraped At",
  "Symbol",
  "Company",
  "52W High",
  "52W Low",
  "Last Price",
  "Last Volume",
  "Change",
  "Change %",
  "No. Trades",
  "Cum. Volume",
  "Open",
  "High",
  "Low",
  "Bid Price",
  "Bid Qty",
  "Offer Price",
  "Offer Qty",
];

function escapeCSV(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = sessionId;
  if (from || to) {
    where.scrapedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  if (!sessionId && !from && !to) {
    const lastSession = await prisma.scrapeSession.findFirst({
      where: { status: "completed" },
      orderBy: { startedAt: "desc" },
    });
    if (lastSession) where.sessionId = lastSession.id;
  }

  const records = await prisma.stockRecord.findMany({
    where,
    orderBy: [{ scrapedAt: "desc" }, { symbol: "asc" }],
  });

  const csvLines = [CSV_HEADERS.join(",")];
  for (const r of records) {
    csvLines.push(
      [
        escapeCSV(r.scrapedAt.toISOString()),
        escapeCSV(r.symbol),
        escapeCSV(r.companyName),
        escapeCSV(r.week52High),
        escapeCSV(r.week52Low),
        escapeCSV(r.lastTradePrice),
        escapeCSV(r.lastTradeVolume),
        escapeCSV(r.lastTradeChange),
        escapeCSV(r.lastTradePctChange),
        escapeCSV(r.numberOfTrades),
        escapeCSV(r.cumulativeVolume),
        escapeCSV(r.todayOpen),
        escapeCSV(r.todayHigh),
        escapeCSV(r.todayLow),
        escapeCSV(r.bestBidPrice),
        escapeCSV(r.bestBidQuantity),
        escapeCSV(r.bestOfferPrice),
        escapeCSV(r.bestOfferQuantity),
      ].join(",")
    );
  }

  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="tadawul-${date}.csv"`,
    },
  });
}
