import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBrowser } from "@/lib/browser";
import { randomBytes } from "crypto";

export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

function cuid() { return "c" + randomBytes(12).toString("hex"); }
function parseNum(s: string | null | undefined): number | null { if (!s || s === "-") return null; const n = parseFloat(s.replace(/,/g, "")); return isNaN(n) ? null : n; }
function parseBigInt(s: string | null | undefined): number | null { if (!s || s === "-") return null; const n = parseInt(s.replace(/,/g, ""), 10); return isNaN(n) ? null : n; }
function extractChange(html: string | null | undefined): number | null {
  if (!html) return null;
  const m = String(html).match(/>([+-]?\d+\.?\d*)</);
  if (m) return parseFloat(m[1]);
  const m2 = String(html).match(/([+-]?\d+\.?\d*)/);
  return m2 ? parseFloat(m2[1]) : null;
}

const PAGE_URL = "https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/reports-publications/historical-reports/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz8DTxCnA3MDILdzUJDLAyNXE30I4EKzHEqMDTTD9aP0o8qTs1JTS5JTfFNLMpOLdGP9HX09EMWd80rySyp1I80AgL9cEJGFmQnJlWlVToCAIqKZ6o!/";

const SECTORS: Record<string, string[]> = {
  "TENI:31": ["2030","2222","2380","2381","2382","4030"],
  "TMTI:32": ["1201","1202","1210","1211","1301","1304","1320","1321","1322","1323","1324","2001","2010","2020","2060","2090","2150","2170","2180","2200","2210","2220","2223","2240","2250","2290","2300","2310","2330","2350","2360","3002","3003","3004","3005","3007","3008","3010","3020","3030","3040","3050","3060","3080","3090","3091","3092","4143"],
  "TCGI:33": ["1212","1214","1302","1303","2040","2110","2160","2320","2370","4110","4140","4141","4142","4144","4145","4146","4147","4148"],
  "TCPI:34": ["1831","1832","1833","1834","1835","4270","6004"],
  "TTRI:35": ["2190","4031","4040","4260","4261","4262","4263","4264","4265"],
  "TCDI:37": ["1213","2130","2340","4011","4012","4180"],
  "TCSI:38": ["1810","1820","1830","4170","4290","4291","4292","6002","6012","6013","6014","6015","6016","6017","6018","6019"],
  "TMEI:39": ["4070","4071","4072","4210"],
  "TDRI:40": ["4003","4008","4050","4051","4190","4191","4192","4193","4194","4200","4240"],
  "TSRI:41": ["4001","4006","4061","4160","4161","4162","4163","4164"],
  "TFBI:42": ["2050","2100","2270","2280","2281","2282","2283","2284","2285","2286","2287","2288","4080","6001","6010","6020","6040","6050","6060","6070","6090"],
  "THPI:43": ["4165"],
  "THCI:44": ["2140","2230","4002","4004","4005","4007","4009","4013","4014","4017","4018","4019","4021"],
  "TPBI:45": ["2070","4015","4016"],
  "TBKI:46": ["1010","1020","1030","1050","1060","1080","1120","1140","1150","1180"],
  "TFSI:47": ["1111","1182","1183","2120","4081","4082","4083","4084","4130","4280"],
  "TINI:48": ["8010","8012","8020","8030","8040","8050","8060","8070","8100","8120","8150","8160","8170","8180","8190","8200","8210","8230","8240","8250","8260","8280","8300","8310","8311","8313"],
  "TSSI:49": ["7200","7201","7202","7203","7204","7211"],
  "TTSI:52": ["7010","7020","7030","7040"],
  "TUTI:53": ["2080","2081","2082","2083","2084","5110"],
  "TRTI:21": ["4330","4331","4332","4333","4334","4335","4336","4337","4338","4339","4340","4342","4344","4345","4346","4347","4348","4349","4350"],
  "TREI:54": ["4020","4090","4100","4150","4220","4230","4250","4300","4310","4320","4321","4322","4323","4324","4325","4326","4327"],
};

function getSectorCode(symbol: string): string {
  for (const [code, syms] of Object.entries(SECTORS)) if (syms.includes(symbol)) return code;
  return "TENI:31";
}

function ymdToDdmmyyyy(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
}

interface Row {
  id: string; symbol: string; date: string;
  open: number | null; high: number | null; low: number | null; close: number | null;
  change: number | null; changePct: number | null;
  volume: number | null; value: number | null; trades: number | null;
}

async function batchInsertRaw(rows: Row[]) {
  if (rows.length === 0) return 0;
  // Use Prisma's raw query for batch insert with conflict resolution
  for (const r of rows) {
    await prisma.historicalPrice.upsert({
      where: { symbol_date: { symbol: r.symbol, date: r.date } },
      update: {
        open: r.open, high: r.high, low: r.low, close: r.close,
        change: r.change, changePct: r.changePct,
        volume: r.volume != null ? BigInt(r.volume) : null,
        value: r.value, trades: r.trades,
      },
      create: {
        symbol: r.symbol, date: r.date,
        open: r.open, high: r.high, low: r.low, close: r.close,
        change: r.change, changePct: r.changePct,
        volume: r.volume != null ? BigInt(r.volume) : null,
        value: r.value, trades: r.trades,
      },
    });
  }
  return rows.length;
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Get last date per symbol
  const result = await prisma.$queryRaw<Array<{ symbol: string; last_date: string }>>`
    SELECT symbol, MAX(date) as last_date FROM "HistoricalPrice" GROUP BY symbol
  `;
  const lastDates: Record<string, string> = {};
  for (const r of result) lastDates[r.symbol] = r.last_date;

  // Today (Riyadh)
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const todayStr = today.toISOString().split("T")[0];
  const todayDdmmyyyy = ymdToDdmmyyyy(todayStr);

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

    let apiUrl = "";
    page.on("request", (req) => {
      if (req.url().includes("populateCompanyDetails") && req.method() === "POST") apiUrl = req.url();
    });
    await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 4000));
    if (!apiUrl) {
      apiUrl = await page.evaluate(() => {
        const e = performance.getEntriesByType("resource").filter((r) => r.name.includes("populateCompanyDetails"));
        return e.length > 0 ? e[0].name : "";
      });
    }

    if (!apiUrl) {
      await browser.close();
      return NextResponse.json({ error: "API URL not captured" }, { status: 500 });
    }

    const allSymbols = Object.values(SECTORS).flat();
    let totalAdded = 0;
    const stockResults: Array<{ symbol: string; added: number }> = [];

    for (const symbol of allSymbols) {
      const lastDate = lastDates[symbol];
      if (!lastDate) continue;
      const lastD = new Date(lastDate);
      lastD.setDate(lastD.getDate() + 1);
      const startStr = lastD.toISOString().split("T")[0];
      if (startStr > todayStr) continue;

      const startDdmmyyyy = ymdToDdmmyyyy(startStr);
      const sectorCode = getSectorCode(symbol);

      try {
        const data = await page.evaluate(async (url, sym, sector, sd, ed) => {
          const fd = new URLSearchParams();
          fd.append("draw", "1");
          const cols = ["transactionDateStr","todaysOpen","highPrice","lowPrice","previousClosePrice","change","changePercent","volumeTraded","turnOver","noOfTrades"];
          for (let i = 0; i < 10; i++) {
            fd.append(`columns[${i}][data]`, cols[i]);
            fd.append(`columns[${i}][name]`, "");
            fd.append(`columns[${i}][searchable]`, "true");
            fd.append(`columns[${i}][orderable]`, "false");
            fd.append(`columns[${i}][search][value]`, "");
            fd.append(`columns[${i}][search][regex]`, "false");
          }
          fd.append("start", "0"); fd.append("length", "100");
          fd.append("search[value]", ""); fd.append("search[regex]", "false");
          fd.append("selectedMarket", "MAIN"); fd.append("selectedSector", sector); fd.append("selectedEntity", sym);
          fd.append("startDate", sd); fd.append("endDate", ed);
          fd.append("tableTabId", "0"); fd.append("startIndex", "0"); fd.append("endIndex", "30");
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" }, body: fd.toString() });
          return await res.json();
        }, apiUrl, symbol, sectorCode, startDdmmyyyy, todayDdmmyyyy);

        const records = (data?.data || []) as Array<Record<string, string>>;
        const rows: Row[] = records.filter((r) => r.transactionDateStr).map((r) => ({
          id: cuid(), symbol, date: r.transactionDateStr,
          open: parseNum(r.todaysOpen), high: parseNum(r.highPrice), low: parseNum(r.lowPrice), close: parseNum(r.previousClosePrice),
          change: extractChange(r.change), changePct: extractChange(r.changePercent),
          volume: parseBigInt(r.volumeTraded), value: parseNum(r.turnOver), trades: parseBigInt(r.noOfTrades),
        }));
        const added = await batchInsertRaw(rows);
        totalAdded += added;
        stockResults.push({ symbol, added });
      } catch {
        // skip
      }
    }

    await browser.close();
    return NextResponse.json({ success: true, totalAdded, stocksUpdated: stockResults.filter(s => s.added > 0).length, today: todayStr });
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
