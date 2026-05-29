import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  amount?: number;
  capitalFirm?: string;
  portfolio?: string | null;
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

  const updates: {
    amount?: number;
    capitalFirm?: string;
    portfolio?: string | null;
  } = {};
  if (body.amount != null) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "Amount must be a non-negative number" },
        { status: 400 }
      );
    }
    updates.amount = amount;
  }
  if (body.capitalFirm != null) {
    const s = String(body.capitalFirm).trim();
    if (!s) return NextResponse.json({ error: "Broker cannot be empty" }, { status: 400 });
    updates.capitalFirm = s;
  }
  if ("portfolio" in body) {
    const s = body.portfolio == null ? null : String(body.portfolio).trim();
    updates.portfolio = s && s.length > 0 ? s : null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.investmentCash.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json({ ok: true, cash: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
