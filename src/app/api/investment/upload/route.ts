import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logTransaction } from "@/lib/portfolio-tx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  fileName?: string;
  cash?: Array<Record<string, unknown>>;
  saudiStocks?: Array<Record<string, unknown>>;
  saudiFunds?: Array<Record<string, unknown>>;
  usaStocks?: Array<Record<string, unknown>>;
  gulfStocks?: Array<Record<string, unknown>>;
}

function n(v: unknown): number | null {
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function s(v: unknown): string {
  return v == null ? "" : String(v);
}
function sn(v: unknown): string | null {
  if (v == null) return null;
  const x = String(v);
  return x ? x : null;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const total =
    (body.cash?.length ?? 0) +
    (body.saudiStocks?.length ?? 0) +
    (body.saudiFunds?.length ?? 0) +
    (body.usaStocks?.length ?? 0) +
    (body.gulfStocks?.length ?? 0);

  if (total === 0) {
    return NextResponse.json(
      { error: "No rows parsed from the workbook" },
      { status: 400 }
    );
  }

  const upload = await prisma.investmentUpload.create({
    data: { fileName: body.fileName || "(unknown)" },
  });

  try {
    if (body.cash?.length) {
      await prisma.investmentCash.createMany({
        data: body.cash.map((r) => ({
          uploadId: upload.id,
          capitalFirm: s(r.capitalFirm),
          portfolio: sn(r.portfolio),
          amount: Number(r.amount ?? 0),
        })),
      });
    }
    if (body.saudiStocks?.length) {
      await prisma.investmentSaudiStock.createMany({
        data: body.saudiStocks.map((r) => ({
          uploadId: upload.id,
          capitalFirm: s(r.capitalFirm),
          stockCode: s(r.stockCode),
          qty: Number(r.qty ?? 0),
          stockCost: n(r.stockCost),
          totalCost: n(r.totalCost),
          brokerMarketPrice: n(r.brokerMarketPrice),
          brokerCurrentValue: n(r.brokerCurrentValue),
        })),
      });
    }
    if (body.saudiFunds?.length) {
      await prisma.investmentSaudiFund.createMany({
        data: body.saudiFunds.map((r) => ({
          uploadId: upload.id,
          capitalFirm: s(r.capitalFirm),
          fundName: s(r.fundName),
          qty: Number(r.qty ?? 0),
          costPerUnit: n(r.costPerUnit),
          totalCost: n(r.totalCost),
          closePrice: n(r.closePrice),
          marketValue: n(r.marketValue),
        })),
      });
    }
    if (body.usaStocks?.length) {
      await prisma.investmentUsaStock.createMany({
        data: body.usaStocks.map((r) => ({
          uploadId: upload.id,
          ticker: s(r.ticker),
          qty: Number(r.qty ?? 0),
          costValue: n(r.costValue),
          closePrice: n(r.closePrice),
          marketValue: n(r.marketValue),
          profitLoss: n(r.profitLoss),
        })),
      });
    }
    if (body.gulfStocks?.length) {
      await prisma.investmentGulfStock.createMany({
        data: body.gulfStocks.map((r) => ({
          uploadId: upload.id,
          capitalFirm: sn(r.capitalFirm),
          market: s(r.market),
          stockCode: s(r.stockCode),
          qty: Number(r.qty ?? 0),
          marketPrice: n(r.marketPrice),
          currentValue: n(r.currentValue),
        })),
      });
    }
  } catch (err) {
    await prisma.investmentUpload.delete({ where: { id: upload.id } });
    return NextResponse.json(
      {
        error: "Failed to save investment data",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  await logTransaction(
    "upload",
    "upload",
    {
      fileName: upload.fileName,
      counts: {
        cash: body.cash?.length ?? 0,
        saudiStocks: body.saudiStocks?.length ?? 0,
        saudiFunds: body.saudiFunds?.length ?? 0,
        usaStocks: body.usaStocks?.length ?? 0,
        gulfStocks: body.gulfStocks?.length ?? 0,
      },
      total,
    },
    {
      entityId: upload.id,
      summary: `Uploaded ${upload.fileName} (${total} rows)`,
    }
  );

  return NextResponse.json({
    ok: true,
    uploadId: upload.id,
    rowCount: total,
  });
}
