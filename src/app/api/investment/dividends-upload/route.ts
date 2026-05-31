import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logTransaction } from "@/lib/portfolio-tx";
import {
  buildMappingIndex,
  resolveSymbol,
  type CandidateName,
} from "@/lib/dividend-mapping";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  fileName?: string;
  rows?: Array<Record<string, unknown>>;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "No dividend rows parsed" }, { status: 400 });
  }

  const candidates: CandidateName[] = [];

  const lastSession = await prisma.scrapeSession.findFirst({
    where: { status: "completed" },
    orderBy: { startedAt: "desc" },
  });
  if (lastSession) {
    const records = await prisma.stockRecord.findMany({
      where: { sessionId: lastSession.id },
      select: { symbol: true, companyName: true },
    });
    for (const r of records) candidates.push({ symbol: r.symbol, name: r.companyName });
  }
  const stored = await prisma.investmentSaudiStock.findMany({
    where: { companyName: { not: null } },
    select: { stockCode: true, companyName: true },
  });
  for (const s of stored) candidates.push({ symbol: s.stockCode, name: s.companyName });
  const profiles = await prisma.companyProfile.findMany({
    select: { symbol: true, companyName: true },
  });
  for (const p of profiles) candidates.push({ symbol: p.symbol, name: p.companyName });

  const index = buildMappingIndex(candidates);

  const upload = await prisma.dividendUpload.create({
    data: {
      fileName: body.fileName || "(unknown)",
      rowCount: body.rows.length,
    },
  });

  let matched = 0;
  try {
    await prisma.dividendPayment.createMany({
      data: body.rows.map((r) => {
        const company = String(r.company ?? "");
        const symbol = resolveSymbol(company, index);
        if (symbol) matched++;
        return {
          uploadId: upload.id,
          company,
          symbol,
          value: Number(r.value ?? 0),
          perShare: r.perShare == null ? null : Number(r.perShare),
          units: r.units == null ? null : Number(r.units),
          distDate: r.distDate ? new Date(String(r.distDate)) : null,
          eligibilityDate: r.eligibilityDate ? new Date(String(r.eligibilityDate)) : null,
          announceDate: r.announceDate ? new Date(String(r.announceDate)) : null,
          type: (r.type as string | null) ?? null,
          status: (r.status as string | null) ?? null,
        };
      }),
    });
  } catch (err) {
    await prisma.dividendUpload.delete({ where: { id: upload.id } });
    return NextResponse.json(
      {
        error: "Failed to save dividends",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  await logTransaction(
    "upload",
    "upload",
    {
      kind: "dividends",
      fileName: upload.fileName,
      total: body.rows.length,
      matched,
      unmatched: body.rows.length - matched,
    },
    {
      entityId: upload.id,
      summary: `Uploaded dividends ${upload.fileName} (${body.rows.length} rows, ${matched} matched)`,
    }
  );

  return NextResponse.json({
    ok: true,
    uploadId: upload.id,
    rowCount: body.rows.length,
    matched,
    unmatched: body.rows.length - matched,
  });
}
