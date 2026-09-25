import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBrowser } from "@/lib/browser";
import { randomBytes } from "crypto";

// Sukuk & Bonds scraper.
//   1. Renders the sukuk market-watch board -> upserts SukukInstrument
//      (reference) and inserts a SukukQuote snapshot (live bid/ask/last).
//   2. Fetches per-instrument historical daily trades from the same
//      populateCompanyDetails endpoint the equity historical scraper uses,
//      but with selectedMarket=SUKUK and an empty sector.
//
// Query params:
//   mode=daily    (default) incremental: fetch history since each code's last
//                 stored date.
//   mode=backfill full history (from 2010) for the code slice; INSERT OR IGNORE
//                 makes it idempotent.
//   offset,limit  process a slice of codes (for chunked backfill). Defaults to
//                 all codes.
//   skipBoard=1   skip the board scrape (history only).

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BOARD_URL =
  "https://www.saudiexchange.sa/wps/portal/saudiexchange/ourmarkets/sukuk-market-watch?locale=en";
const HIST_URL =
  "https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/reports-publications/historical-reports/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz8DTxCnA3MDILdzUJDLAyNXE30I4EKzHEqMDTTD9aP0o8qTs1JTS5JTfFNLMpOLdGP9HX09EMWd80rySyp1I80AgL9cEJGFmQnJlWlVToCAIqKZ6o!/";

const HIST_COLS = [
  "transactionDateStr",
  "todaysOpen",
  "highPrice",
  "lowPrice",
  "previousClosePrice",
  "change",
  "changePercent",
  "volumeTraded",
  "turnOver",
  "noOfTrades",
];

function cuid() {
  return "c" + randomBytes(12).toString("hex");
}
function parseNum(s: unknown): number | null {
  if (s === null || s === undefined) return null;
  const str = String(s).replace(/<[^>]+>/g, "").replace(/,/g, "").trim();
  if (!str || str === "-") return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}
function parseIntNum(s: unknown): number | null {
  const n = parseNum(s);
  return n === null ? null : Math.trunc(n);
}
function extractChange(html: unknown): number | null {
  if (html === null || html === undefined) return null;
  const s = String(html);
  const m = s.match(/>([+-]?\d[\d,]*\.?\d*)</);
  if (m) return parseFloat(m[1].replace(/,/g, ""));
  const m2 = s.replace(/<[^>]+>/g, "").match(/([+-]?\d[\d,]*\.?\d*)/);
  return m2 ? parseFloat(m2[1].replace(/,/g, "")) : null;
}
function normDate(s: unknown): string | null {
  if (!s) return null;
  const str = String(s).trim().replace(/\//g, "-");
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function ymdToDdmmyyyy(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
}
function sqlVal(v: string | number | null): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return isNaN(v) ? "NULL" : String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

interface HistRow {
  code: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  value: number | null;
  trades: number | null;
  yld: number | null;
}

async function insertHistory(rows: HistRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const cols =
    '("id","code","date","open","high","low","close","change","changePct","volume","value","trades","yield")';
  const CHUNK = 60;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = slice
      .map(
        (r) =>
          "(" +
          [
            sqlVal(cuid()),
            sqlVal(r.code),
            sqlVal(r.date),
            sqlVal(r.open),
            sqlVal(r.high),
            sqlVal(r.low),
            sqlVal(r.close),
            sqlVal(r.change),
            sqlVal(r.changePct),
            sqlVal(r.volume),
            sqlVal(r.value),
            sqlVal(r.trades),
            sqlVal(r.yld),
          ].join(",") +
          ")"
      )
      .join(",");
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "SukukHistoricalPrice" ${cols} VALUES ${values}`
    );
    inserted += slice.length;
  }
  return inserted;
}

interface BoardRow {
  code: string;
  name: string | null;
  isin: string | null;
  couponType: string | null;
  couponRate: number | null;
  maturityDate: string | null;
  instrumentYield: number | null;
  bidYield: number | null;
  askYield: number | null;
  parValue: number | null;
  lastPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  issuanceAmount: number | null;
  currency: string | null;
  couponFrequency: string | null;
  dayCount: string | null;
}

export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const started = Date.now();
  const sp = request.nextUrl.searchParams;
  const mode = sp.get("mode") === "backfill" ? "backfill" : "daily";
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const limit = Math.max(1, parseInt(sp.get("limit") || "999", 10) || 999);
  const skipBoard = sp.get("skipBoard") === "1";
  const TIME_BUDGET_MS = 250_000;

  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" })
  );
  const todayStr = today.toISOString().split("T")[0];
  const todayDmy = ymdToDdmmyyyy(todayStr);

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    );

    // ---- 1. Board scrape (reference + live quote snapshot) ----
    let boardCount = 0;
    let quoteCount = 0;
    if (!skipBoard) {
      await page.goto(BOARD_URL, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page
        .waitForSelector("#sukukAndBondsMarketWatchTable tbody tr td", {
          timeout: 25000,
        })
        .catch(() => {});
      await page
        .waitForFunction(
          () => {
            const t = document.querySelector("#sukukAndBondsMarketWatchTable");
            if (!t) return false;
            return (
              Array.from(t.querySelectorAll("tbody tr")).filter(
                (r) => r.querySelectorAll("td").length >= 15
              ).length > 0
            );
          },
          { timeout: 25000 }
        )
        .catch(() => {});

      const board: BoardRow[] = await page.evaluate(() => {
        const t = document.querySelector("#sukukAndBondsMarketWatchTable");
        if (!t) return [];
        const rows = Array.from(t.querySelectorAll("tbody tr"));
        const out: string[][] = [];
        for (const r of rows) {
          const cells = Array.from(r.querySelectorAll("td")).map(
            (td) => (td.textContent || "").replace(/\s+/g, " ").trim()
          );
          if (cells.length >= 15 && /^\d+$/.test(cells[0])) out.push(cells);
        }
        return out.map((c) => ({
          code: c[0],
          name: c[1] || null,
          isin: c[2] || null,
          couponType: c[3] || null,
          couponRateRaw: c[4],
          maturityDate: c[5] || null,
          instrumentYieldRaw: c[6],
          bidYieldRaw: c[7],
          askYieldRaw: c[8],
          parValueRaw: c[9],
          lastPriceRaw: c[10],
          bidPriceRaw: c[11],
          askPriceRaw: c[12],
          issuanceAmountRaw: c[13],
          currency: c[14] || null,
          couponFrequency: c[15] || null,
          dayCount: c[16] || null,
        })) as unknown as BoardRow[];
      });

      // Normalize numeric fields (evaluate returns raw strings).
      const norm = (board as unknown as Record<string, unknown>[]).map((b) => ({
        code: String(b.code),
        name: (b.name as string) ?? null,
        isin: (b.isin as string) ?? null,
        couponType: (b.couponType as string) ?? null,
        couponRate: parseNum(b.couponRateRaw),
        maturityDate: (b.maturityDate as string) ?? null,
        instrumentYield: parseNum(b.instrumentYieldRaw),
        bidYield: parseNum(b.bidYieldRaw),
        askYield: parseNum(b.askYieldRaw),
        parValue: parseNum(b.parValueRaw),
        lastPrice: parseNum(b.lastPriceRaw),
        bidPrice: parseNum(b.bidPriceRaw),
        askPrice: parseNum(b.askPriceRaw),
        issuanceAmount: parseNum(b.issuanceAmountRaw),
        currency: (b.currency as string) ?? null,
        couponFrequency: (b.couponFrequency as string) ?? null,
        dayCount:
          b.dayCount && b.dayCount !== "-" ? (b.dayCount as string) : null,
      }));

      for (const b of norm) {
        await prisma.sukukInstrument.upsert({
          where: { code: b.code },
          update: {
            name: b.name,
            isin: b.isin,
            couponType: b.couponType,
            couponRate: b.couponRate,
            maturityDate: b.maturityDate,
            parValue: b.parValue,
            issuanceAmount: b.issuanceAmount,
            currency: b.currency,
            couponFrequency: b.couponFrequency,
            dayCount: b.dayCount,
          },
          create: {
            code: b.code,
            name: b.name,
            isin: b.isin,
            couponType: b.couponType,
            couponRate: b.couponRate,
            maturityDate: b.maturityDate,
            parValue: b.parValue,
            issuanceAmount: b.issuanceAmount,
            currency: b.currency,
            couponFrequency: b.couponFrequency,
            dayCount: b.dayCount,
          },
        });
      }
      boardCount = norm.length;

      if (norm.length) {
        await prisma.sukukQuote.createMany({
          data: norm.map((b) => ({
            code: b.code,
            instrumentYield: b.instrumentYield,
            bidYield: b.bidYield,
            askYield: b.askYield,
            lastPrice: b.lastPrice,
            bidPrice: b.bidPrice,
            askPrice: b.askPrice,
          })),
        });
        quoteCount = norm.length;
      }
    }

    // ---- 2. Determine code list + per-code start date ----
    const instruments = await prisma.sukukInstrument.findMany({
      select: { code: true },
      orderBy: { code: "asc" },
    });
    const allCodes = instruments.map((i) => i.code);
    const codes = allCodes.slice(offset, offset + limit);

    const lastDates: Record<string, string> = {};
    if (mode === "daily") {
      const rows = await prisma.$queryRaw<
        Array<{ code: string; last_date: string }>
      >`SELECT code, MAX(date) as last_date FROM "SukukHistoricalPrice" GROUP BY code`;
      for (const r of rows) lastDates[r.code] = r.last_date;
    }

    // ---- 3. Load historical-reports page, capture the AJAX endpoint ----
    let apiUrl = "";
    page.on("request", (req) => {
      if (
        req.url().includes("populateCompanyDetails") &&
        req.method() === "POST"
      )
        apiUrl = req.url();
    });
    await page.goto(HIST_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3500));
    if (!apiUrl) {
      apiUrl = await page.evaluate(() => {
        const e = performance
          .getEntriesByType("resource")
          .filter((r) => r.name.includes("populateCompanyDetails"));
        return e.length ? e[0].name : "";
      });
    }
    if (!apiUrl) {
      await browser.close();
      return NextResponse.json(
        { error: "populateCompanyDetails endpoint not captured", boardCount },
        { status: 500 }
      );
    }

    // ---- 4. Fetch history per code ----
    let totalAdded = 0;
    let processed = 0;
    let timedOut = false;
    const perCode: Array<{ code: string; added: number; fetched: number }> = [];

    for (const code of codes) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        timedOut = true;
        break;
      }
      let startStr = "2010-01-01";
      if (mode === "daily") {
        const last = lastDates[code];
        if (last) {
          const d = new Date(last);
          d.setDate(d.getDate() + 1);
          startStr = d.toISOString().split("T")[0];
        }
      }
      if (startStr > todayStr) {
        perCode.push({ code, added: 0, fetched: 0 });
        processed++;
        continue;
      }
      const startDmy = ymdToDdmmyyyy(startStr);

      // The endpoint hard-caps at 100 rows per request, newest-first. Page
      // backward by moving endDate to (oldest returned date - 1 day) until a
      // page returns < 100 rows or we pass the start date.
      try {
        const rowsByDate = new Map<string, HistRow>();
        let endCursorDmy = todayDmy;
        let fetched = 0;
        for (let pageIdx = 0; pageIdx < 120; pageIdx++) {
          const data = await page.evaluate(
            async (url, sym, cols, sd, ed) => {
              const fd = new URLSearchParams();
              fd.append("draw", "1");
              for (let i = 0; i < cols.length; i++) {
                fd.append(`columns[${i}][data]`, cols[i]);
                fd.append(`columns[${i}][name]`, "");
                fd.append(`columns[${i}][searchable]`, "true");
                fd.append(`columns[${i}][orderable]`, "false");
                fd.append(`columns[${i}][search][value]`, "");
                fd.append(`columns[${i}][search][regex]`, "false");
              }
              fd.append("start", "0");
              fd.append("length", "100");
              fd.append("search[value]", "");
              fd.append("search[regex]", "false");
              fd.append("selectedMarket", "SUKUK");
              fd.append("selectedSector", "");
              fd.append("selectedEntity", sym);
              fd.append("startDate", sd);
              fd.append("endDate", ed);
              fd.append("tableTabId", "0");
              fd.append("startIndex", "0");
              fd.append("endIndex", "30");
              const res = await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  "X-Requested-With": "XMLHttpRequest",
                },
                body: fd.toString(),
              });
              try {
                return await res.json();
              } catch {
                return { data: [] };
              }
            },
            apiUrl,
            code,
            HIST_COLS,
            startDmy,
            endCursorDmy
          );

          const recs = (data?.data || []) as Array<Record<string, unknown>>;
          if (recs.length === 0) break;
          fetched += recs.length;
          let oldest: string | null = null;
          for (const r of recs) {
            const date = normDate(r.transactionDateStr ?? r.transactionDate);
            if (!date) continue;
            if (!oldest || date < oldest) oldest = date;
            if (!rowsByDate.has(date)) {
              rowsByDate.set(date, {
                code,
                date,
                open: parseNum(r.todaysOpen),
                high: parseNum(r.highPrice),
                low: parseNum(r.lowPrice),
                close: parseNum(r.previousClosePrice),
                change: extractChange(r.change),
                changePct: extractChange(r.changePercent),
                volume: parseNum(r.volumeTraded),
                value: parseNum(r.turnOver),
                trades: parseIntNum(r.noOfTrades),
                yld: parseNum(r.lastYield),
              });
            }
          }
          if (recs.length < 100 || !oldest) break;
          const prev = new Date(oldest);
          prev.setDate(prev.getDate() - 1);
          const prevYmd = prev.toISOString().split("T")[0];
          if (prevYmd < startStr) break;
          endCursorDmy = ymdToDdmmyyyy(prevYmd);
        }
        const rows = Array.from(rowsByDate.values());
        const added = await insertHistory(rows);
        totalAdded += added;
        perCode.push({ code, added, fetched });
      } catch (e) {
        perCode.push({ code, added: 0, fetched: -1 });
      }
      processed++;
      await new Promise((r) => setTimeout(r, 150));
    }

    await browser.close();
    const nextOffset = offset + processed;
    return NextResponse.json({
      success: true,
      mode,
      boardCount,
      quoteCount,
      codesTotal: allCodes.length,
      offset,
      processed,
      totalAdded,
      timedOut,
      done: nextOffset >= allCodes.length,
      nextOffset: nextOffset < allCodes.length ? nextOffset : null,
      elapsedMs: Date.now() - started,
      perCode: perCode.filter((p) => p.added > 0 || p.fetched < 0),
    });
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
