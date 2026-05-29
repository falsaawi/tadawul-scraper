import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  qty?: number;
  marketPrice?: number;
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

  const existing = await prisma.investmentGulfStock.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Holding not found" }, { status: 404 });

  const updates: {
    qty?: number;
    marketPrice?: number | null;
    currentValue?: number | null;
  } = {};

  if (body.qty != null) {
    const r = numOrNull(body.qty, "Quantity");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    if (r.v == null) return NextResponse.json({ error: "Quantity required" }, { status: 400 });
    updates.qty = r.v;
  }
  if ("marketPrice" in body) {
    const r = numOrNull(body.marketPrice, "Market price");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    updates.marketPrice = r.v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const newQty = updates.qty ?? existing.qty;
  const newPrice = "marketPrice" in updates ? updates.marketPrice : existing.marketPrice;
  updates.currentValue = newPrice != null ? newPrice * newQty : existing.currentValue;

  try {
    const updated = await prisma.investmentGulfStock.update({
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
