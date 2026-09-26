import { NextRequest, NextResponse } from "next/server";
import { scrapeCompanyProfile } from "@/lib/company-scraper";
import { storeCompanyData } from "@/lib/company-store";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Scrape one company and store it ADDITIVELY (upsert profile + financials,
// insert only new announcements/dividends/board/corporate-actions; never
// deletes existing rows).
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }
  try {
    const data = await scrapeCompanyProfile(symbol);
    const counts = await storeCompanyData(data);
    return NextResponse.json({ success: true, symbol, ...counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
