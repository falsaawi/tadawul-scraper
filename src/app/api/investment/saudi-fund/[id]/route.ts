import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDiff, logTransaction } from "@/lib/portfolio-tx";

export const dynamic = "force-dynamic";

interface PatchBody {
  qty?: number;
  costPerUnit?: number;
  closePrice?: number;
  fundName?: string;
  capitalFirm?: string;
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

  const existing = await prisma.investmentSaudiFund.findUnique({
    where: { id },
  });
  if (!existing) return NextResponse.json({ error: "Fund not found" }, { status: 404 });

  const updates: {
    qty?: number;
    costPerUnit?: number | null;
    totalCost?: number | null;
    closePrice?: number | null;
    marketValue?: number | null;
    fundName?: string;
    capitalFirm?: string;
  } = {};
  if (body.fundName != null) {
    const s = String(body.fundName).trim();
    if (!s) return NextResponse.json({ error: "Fund name cannot be empty" }, { status: 400 });
    updates.fundName = s;
  }
  if (body.capitalFirm != null) {
    const s = String(body.capitalFirm).trim();
    if (!s) return NextResponse.json({ error: "Capital firm cannot be empty" }, { status: 400 });
    updates.capitalFirm = s;
  }

  if (body.qty != null) {
    const r = numOrNull(body.qty, "Quantity");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    if (r.v == null) return NextResponse.json({ error: "Quantity required" }, { status: 400 });
    updates.qty = r.v;
  }
  if ("costPerUnit" in body) {
    const r = numOrNull(body.costPerUnit, "Cost per unit");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    updates.costPerUnit = r.v;
  }
  if ("closePrice" in body) {
    const r = numOrNull(body.closePrice, "Close price (NAV)");
    if (!r.ok) return NextResponse.json({ error: r.err }, { status: 400 });
    updates.closePrice = r.v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const newQty = updates.qty ?? existing.qty;
  const newCost = "costPerUnit" in updates ? updates.costPerUnit : existing.costPerUnit;
  const newNav = "closePrice" in updates ? updates.closePrice : existing.closePrice;

  updates.totalCost = newCost != null ? newCost * newQty : null;
  updates.marketValue = newNav != null ? newNav * newQty : existing.marketValue;

  try {
    const updated = await prisma.investmentSaudiFund.update({
      where: { id },
      data: updates,
    });
    const diff = buildDiff(existing as unknown as Record<string, unknown>, updates);
    if (Object.keys(diff).length > 0) {
      await logTransaction("saudi-fund", "update", diff, {
        entityId: id,
        summary: `Edited fund ${updated.fundName}`,
      });
    }
    return NextResponse.json({ ok: true, holding: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
