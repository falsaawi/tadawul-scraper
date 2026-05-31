import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logTransaction } from "@/lib/portfolio-tx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  fileName?: string;
  rows?: Array<Record<string, unknown>>;
}

function normaliseName(s: string): string {
  // Strip whitespace and common Arabic prefixes/suffixes to improve match rate
  return s
    .replace(/\s+/g, "")
    .replace(/^شركة/, "")
    .replace(/^مجموعة/, "")
    .toLowerCase();
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

  // Build a company-name -> symbol map from any source we have. This is
  // best-effort; rows that fail to resolve keep symbol=null and still show
  // in totals (they just can't be tied to a specific Saudi holding).
  const nameToSymbol = new Map<string, string>();
  const indexName = (name: string | null | undefined, symbol: string) => {
    if (!name) return;
    const k = normaliseName(name);
    if (k && !nameToSymbol.has(k)) nameToSymbol.set(k, symbol);
  };

  // 1) Latest completed scrape session (richest source)
  const lastSession = await prisma.scrapeSession.findFirst({
    where: { status: "completed" },
    orderBy: { startedAt: "desc" },
  });
  if (lastSession) {
    const records = await prisma.stockRecord.findMany({
      where: { sessionId: lastSession.id },
      select: { symbol: true, companyName: true },
    });
    for (const r of records) indexName(r.companyName, r.symbol);
  }
  // 2) Manually-edited names on Saudi holdings
  const stored = await prisma.investmentSaudiStock.findMany({
    where: { companyName: { not: null } },
    select: { stockCode: true, companyName: true },
  });
  for (const s of stored) indexName(s.companyName, s.stockCode);
  // 3) Company profiles
  const profiles = await prisma.companyProfile.findMany({
    select: { symbol: true, companyName: true },
  });
  for (const p of profiles) indexName(p.companyName, p.symbol);

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
        const key = normaliseName(company);
        let symbol = nameToSymbol.get(key) ?? null;
        if (!symbol && key) {
          // Substring fallback — useful for short broker names like "اس تي سي"
          for (const [k, v] of nameToSymbol) {
            if (k.includes(key) || key.includes(k)) {
              symbol = v;
              break;
            }
          }
        }
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
      summary: `Uploaded dividends ${upload.fileName} (${body.rows.length} rows, ${matched} matched to symbols)`,
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
