import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const page = parseInt(searchParams.get("page") || "1");

  const [sessions, total] = await Promise.all([
    prisma.scrapeSession.findMany({
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scrapeSession.count(),
  ]);

  return NextResponse.json({
    sessions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
