import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/sukuk/commentary -> latest stored universe (market-wide) analysis.
export async function GET() {
  const latest = await prisma.sukukAnalysis.findFirst({
    where: { scope: "universe" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return NextResponse.json({ analysis: null });
  return NextResponse.json({
    createdAt: latest.createdAt,
    model: latest.model,
    analysis: JSON.parse(latest.data),
  });
}
