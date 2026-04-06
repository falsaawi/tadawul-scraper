import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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
    include: { session: { select: { startedAt: true } } },
  });

  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(JSON.stringify(records, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tadawul-${date}.json"`,
    },
  });
}
