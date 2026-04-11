import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const statements = await prisma.financialStatement.findMany({
    where: { symbol },
    orderBy: { period: "desc" },
  });

  const annual = statements
    .filter((s) => s.type === "annual")
    .sort((a, b) => b.period.localeCompare(a.period));

  const quarterly = statements
    .filter((s) => s.type === "quarterly")
    .sort((a, b) => b.period.localeCompare(a.period));

  return NextResponse.json({ symbol, annual, quarterly });
}
