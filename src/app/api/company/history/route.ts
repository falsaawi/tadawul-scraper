import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const where: Record<string, unknown> = { symbol };
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const prices = await prisma.historicalPrice.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      date: true,
      open: true,
      high: true,
      low: true,
      close: true,
      change: true,
      changePct: true,
      volume: true,
      value: true,
      trades: true,
    },
  });

  // Convert BigInt to number for JSON serialization
  const serialized = prices.map((p) => ({
    ...p,
    volume: p.volume != null ? Number(p.volume) : null,
  }));

  return NextResponse.json({
    symbol,
    count: serialized.length,
    prices: serialized,
  });
}
