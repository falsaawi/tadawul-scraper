import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  amount?: number;
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

  if (body.amount == null) {
    return NextResponse.json({ error: "Amount required" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: "Amount must be a non-negative number" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.investmentCash.update({
      where: { id },
      data: { amount },
    });
    return NextResponse.json({ ok: true, cash: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
