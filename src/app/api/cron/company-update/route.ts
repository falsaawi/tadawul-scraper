import { NextRequest, NextResponse } from "next/server";
import { scrapeCompanyProfile } from "@/lib/company-scraper";
import { storeCompanyData } from "@/lib/company-store";
import { ALL_SYMBOLS, sectorOf } from "@/lib/symbols";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Full company data update across all symbols, additive (never deletes).
// Chunked + resumable: ?offset=&limit= process a slice with a ~250s budget.
// Guarded by CRON_SECRET.
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const started = Date.now();
  const sp = request.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const limit = Math.max(1, parseInt(sp.get("limit") || "12", 10) || 12);
  const BUDGET = 250_000;

  const symbols = ALL_SYMBOLS.slice(offset, offset + limit);
  const results: Array<Record<string, unknown>> = [];
  let processed = 0;
  let timedOut = false;
  const totals = {
    created: 0,
    announcements: 0,
    dividends: 0,
    boardMembers: 0,
    corporateActions: 0,
    financials: 0,
    failed: 0,
  };

  for (const symbol of symbols) {
    if (Date.now() - started > BUDGET) {
      timedOut = true;
      break;
    }
    try {
      const data = await scrapeCompanyProfile(symbol);
      data.sector = sectorOf(symbol);
      const c = await storeCompanyData(data);
      totals.announcements += c.announcements;
      totals.dividends += c.dividends;
      totals.boardMembers += c.boardMembers;
      totals.corporateActions += c.corporateActions;
      totals.financials += c.financials;
      if (c.created) totals.created++;
      results.push({ symbol, ...c });
    } catch (e) {
      totals.failed++;
      results.push({ symbol, error: e instanceof Error ? e.message : String(e) });
    }
    processed++;
  }

  const nextOffset = offset + processed;
  return NextResponse.json({
    success: true,
    total: ALL_SYMBOLS.length,
    offset,
    processed,
    timedOut,
    done: nextOffset >= ALL_SYMBOLS.length,
    nextOffset: nextOffset < ALL_SYMBOLS.length ? nextOffset : null,
    totals,
    elapsedMs: Date.now() - started,
    results: results.filter(
      (r) =>
        r.error ||
        (r.financials as number) > 0 ||
        (r.announcements as number) > 0 ||
        (r.dividends as number) > 0
    ),
  });
}
