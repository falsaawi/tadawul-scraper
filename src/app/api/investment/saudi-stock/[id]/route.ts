import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDiff, logTransaction } from "@/lib/portfolio-tx";

export const dynamic = "force-dynamic";

interface PatchBody {
  qty?: number;
  avgCost?: number;
  stockCode?: string;
  capitalFirm?: string;
  companyName?: string | null;
  brokerMarketPrice?: number | null;
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

  const updates: {
    qty?: number;
    stockCost?: number;
    totalCost?: number | null;
    stockCode?: string;
    capitalFirm?: string;
    companyName?: string | null;
    brokerMarketPrice?: number | null;
    brokerCurrentValue?: number | null;
  } = {};
  if (body.stockCode != null) {
    const s = String(body.stockCode).trim();
    if (!s) return NextResponse.json({ error: "Stock code cannot be empty" }, { status: 400 });
    updates.stockCode = s;
  }
  if (body.capitalFirm != null) {
    const s = String(body.capitalFirm).trim();
    if (!s) return NextResponse.json({ error: "Capital firm cannot be empty" }, { status: 400 });
    updates.capitalFirm = s;
  }
  if ("companyName" in body) {
    const s = body.companyName == null ? null : String(body.companyName).trim();
    updates.companyName = s && s.length > 0 ? s : null;
  }
  if ("brokerMarketPrice" in body) {
    const raw = body.brokerMarketPrice;
    if (raw == null) {
      updates.brokerMarketPrice = null;
    } else {
      const p = Number(raw);
      if (!Number.isFinite(p) || p < 0) {
        return NextResponse.json({ error: "Broker market price must be a non-negative number" }, { status: 400 });
      }
      updates.brokerMarketPrice = p;
    }
  }
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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Read existing to compute totalCost / brokerCurrentValue from the resulting combination
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
  } else if (updates.qty != null) {
    updates.totalCost = null;
  }
  const newPrice = "brokerMarketPrice" in updates ? updates.brokerMarketPrice : existing.brokerMarketPrice;
  if (newPrice != null) {
    updates.brokerCurrentValue = newPrice * newQty;
  } else if (updates.qty != null) {
    updates.brokerCurrentValue = existing.brokerCurrentValue;
  }

  try {
    const updated = await prisma.investmentSaudiStock.update({
      where: { id },
      data: updates,
    });
    const diff = buildDiff(existing as unknown as Record<string, unknown>, updates);
    if (Object.keys(diff).length > 0) {
      await logTransaction("saudi-stock", "update", diff, {
        entityId: id,
        summary: `Edited Saudi stock ${updated.stockCode} (${updated.capitalFirm})`,
      });
    }
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
