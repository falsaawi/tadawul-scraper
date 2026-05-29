import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
  const page = parseInt(searchParams.get("page") || "1");
  const entityType = searchParams.get("entityType");

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;

  const [rows, total] = await Promise.all([
    prisma.investmentTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.investmentTransaction.count({ where }),
  ]);

  return NextResponse.json({
    rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
