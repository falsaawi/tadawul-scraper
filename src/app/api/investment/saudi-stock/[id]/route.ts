import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  qty?: number;
  avgCost?: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { qty?: number; stockCost?: number; totalCost?: number } = {};
  if (body.qty != null) {
    const q = Number(body.qty);
    if (!Number.isFinite(q) || q < 0) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative number" },
        { status: 400 }
      );
    }
    updates.qty = q;
  }
  if (body.avgCost != null) {
    const a = Number(body.avgCost);
    if (!Number.isFinite(a) || a < 0) {
      return NextResponse.json(
        { error: "Average cost must be a non-negative number" },
        { status: 400 }
      );
    }
    updates.stockCost = a;
  }

  if (updates.qty == null && updates.stockCost == null) {
    return NextResponse.json(
      { error: "Provide qty and/or avgCost to update" },
      { status: 400 }
    );
  }

  // Read existing to compute totalCost from the resulting combination
  const existing = await prisma.investmentSaudiStock.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const newQty = updates.qty ?? existing.qty;
  const newAvg = updates.stockCost ?? existing.stockCost ?? null;
  if (newAvg != null) {
    updates.totalCost = newAvg * newQty;
  }

  try {
    const updated = await prisma.investmentSaudiStock.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json({ ok: true, holding: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to update",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
