import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const latest = searchParams.get("latest") === "true";

  const where: Record<string, unknown> = {};

  if (sessionId) where.sessionId = sessionId;
  if (symbol) where.symbol = { contains: symbol };
  if (from || to) {
    where.scrapedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  // If "latest" flag, get data from the most recent completed session
  if (latest) {
    const lastSession = await prisma.scrapeSession.findFirst({
      where: { status: "completed" },
      orderBy: { startedAt: "desc" },
    });
    if (lastSession) {
      where.sessionId = lastSession.id;
    }
  }

  const [records, total] = await Promise.all([
    prisma.stockRecord.findMany({
      where,
      orderBy: { scrapedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { session: { select: { startedAt: true, status: true } } },
    }),
    prisma.stockRecord.count({ where }),
  ]);

  return NextResponse.json({
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
