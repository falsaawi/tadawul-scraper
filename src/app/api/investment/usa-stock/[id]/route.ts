import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  qty?: number;
  costValue?: number;
  closePrice?: number;
  ticker?: string;
}

function numOrNull(v: unknown, label: string): { ok: true; v: number | null } | { ok: false; err: string } {
  if (v == null || v === "") return { ok: true, v: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0)
    return { ok: false, err: `${label} must be a non-negative number` };
  return { ok: true, v: n };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.investmentUsaStock.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Holding not found" }, { status: 404 });

  const updates: {
    qty?: number;
    costValue?: number | null;
    closePrice?: number | null;
    marketValue?: number | null;
    profitLoss?: number | null;
    ticker?: string;
  } = {};
  if (body.ticker != null) {
    const s = String(body.ticker).trim().toUpperCase();
    if (!s) return NextResponse.json({ error: "Ticker cannot be empty" }, { status: 400 });
    updates.ticker = s;
  }

  if (body.qty != null) {
    const r = numOrNull(body.qty, "Quantity");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    if (r.v == null) return NextResponse.json({ error: "Quantity required" }, { status: 400 });
    updates.qty = r.v;
  }
  if ("costValue" in body) {
    const r = numOrNull(body.costValue, "Cost");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    updates.costValue = r.v;
  }
  if ("closePrice" in body) {
    const r = numOrNull(body.closePrice, "Close price");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    updates.closePrice = r.v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const newQty = updates.qty ?? existing.qty;
  const newClose = "closePrice" in updates ? updates.closePrice : existing.closePrice;
  const newCost = "costValue" in updates ? updates.costValue : existing.costValue;

  updates.marketValue = newClose != null ? newClose * newQty : existing.marketValue;
  if (updates.marketValue != null && newCost != null) {
    updates.profitLoss = updates.marketValue - newCost;
  }

  try {
    const updated = await prisma.investmentUsaStock.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json({ ok: true, holding: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
