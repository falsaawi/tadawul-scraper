import { getBrowser } from "./browser";
import { parseNumber, parseInteger } from "./utils";
import type { StockRecordInput, ScrapeResult } from "@/types/market";

const MARKET_WATCH_URL =
  "https://www.saudiexchange.sa/wps/portal/saudiexchange/ourmarkets/main-market-watch/!ut/p/z1/jdBLC4JAFAXgX-PWezAch3aSpNhDTSKbTWiYCqkxTfn3k9qU9Lq7e_kOHC4JSkg06bUqUlW1TXrs961gO9NmMDyOgDvOBNF0xj0fgQFm0eYVIA7NHoSL0RwruGAk_snjw9j4nRcDsnAZoqUdBYZlArExBG8q3sGXDj6J4thmj3_YTTbiBQmZH3KZS_0i-3Op1Ok81qCh6zo9q5pC37e1hneBsj0rSp4dxamkU71OUIX1hit-Awgt4LQ!/dz/d5/L0lHSkovd0RNQU5rQUVnQSEhLzROVkUvZW4!/";

// The table #marketWatchTable1 has a fixed 15-column structure:
// Row 1 (groups): Company | 52 Weeks Range | Last Trade (4 cols) | Cumulative (2 cols) | Today's (3 cols) | Best Bid (2 cols) | BestOffer (2 cols)
// Row 2 (details):                          | Price | Volume | Change Value | Change % | No. of Trades | VolumeTraded | Open | High | Low | Price | Volume | Price | Volume
//
// Column indices in tbody (0-indexed):
// 0  = Company (name + symbol combined, e.g., "SARCO2030" or "SAUDI ARAMCO2222")
// 1  = 52 Weeks Range (low + high merged text, e.g., "23.0427.5027.74")
// 2  = Last Trade Price
// 3  = Last Trade Volume
// 4  = Change Value
// 5  = Change %
// 6  = No. of Trades
// 7  = Cumulative VolumeTraded
// 8  = Today's Open
// 9  = Today's High
// 10 = Today's Low
// 11 = Best Bid Price
// 12 = Best Bid Volume
// 13 = Best Offer Price
// 14 = Best Offer Volume

function parseCompanyCell(text: string): { companyName: string; symbol: string } {
  // The company cell contains the name followed by the symbol number
  // e.g., "SARCO2030", "SAUDI ARAMCO2222", "Al Rajhi Bank1120"
  // The symbol is usually the last 4 digits
  const match = text.match(/^(.+?)(\d{4})$/);
  if (match) {
    return { companyName: match[1].trim(), symbol: match[2] };
  }
  return { companyName: text, symbol: text };
}

function parse52WeekRange(text: string, currentPrice: number | null): { low: number | null; high: number | null } {
  // The cell contains 3 concatenated decimal numbers: "low" + "current" + "high"
  // e.g., "23.0427.5027.74" = 23.04 (low) + 27.50 (current) + 27.74 (high)
  // e.g., "6.2610.9211.35" = 6.26 (low) + 10.92 (current) + 11.35 (high)
  //
  // Strategy: Use the current price (from column 2) to split the string.
  // The middle number should match or be close to the current price.

  if (!text || text.trim() === "" || text === "-") return { low: null, high: null };

  // Try to find decimal numbers by splitting on digit-followed-by-decimal patterns
  // Look for patterns like "XX.XX" separated by nothing
  const decimalPattern = /(\d+\.?\d*)/g;
  const allNumbers: number[] = [];
  let match;
  while ((match = decimalPattern.exec(text)) !== null) {
    const n = parseFloat(match[1]);
    if (!isNaN(n)) allNumbers.push(n);
  }

  // If we have exactly 3 numbers (from the raw regex), they might be split wrong
  // because "23.0427.5027.74" only has 3 decimal points
  // Better approach: try to split using the known current price
  if (currentPrice && currentPrice > 0) {
    const priceStr = currentPrice.toFixed(2);
    const idx = text.indexOf(priceStr);
    if (idx > 0) {
      const lowStr = text.substring(0, idx);
      const highStr = text.substring(idx + priceStr.length);
      const low = parseFloat(lowStr);
      const high = parseFloat(highStr);
      if (!isNaN(low) && !isNaN(high) && low > 0 && high > 0) {
        return { low, high };
      }
      // If high is empty, it might be at the end differently
      if (!isNaN(low) && low > 0) {
        return { low, high: isNaN(high) || high <= 0 ? currentPrice : high };
      }
    }

    // Try with non-padded price string
    const priceStr2 = String(currentPrice);
    const idx2 = text.indexOf(priceStr2);
    if (idx2 > 0) {
      const lowStr = text.substring(0, idx2);
      const highStr = text.substring(idx2 + priceStr2.length);
      const low = parseFloat(lowStr);
      const high = parseFloat(highStr);
      if (!isNaN(low) && low > 0) {
        return { low, high: !isNaN(high) && high > 0 ? high : currentPrice };
      }
    }
  }

  // Fallback: if we found at least 2 numbers, use min/max
  if (allNumbers.length >= 2) {
    return {
      low: Math.min(...allNumbers),
      high: Math.max(...allNumbers),
    };
  }

  return { low: null, high: null };
}

export async function scrapeMarketData(): Promise<ScrapeResult> {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    console.log("[Scraper] Navigating to market watch page...");
    await page.goto(MARKET_WATCH_URL, { waitUntil: "networkidle2", timeout: 45000 });

    // Wait for the specific table
    console.log("[Scraper] Waiting for #marketWatchTable1...");
    await page.waitForSelector("#marketWatchTable1 tbody tr td", { timeout: 20000 });

    // Give it a moment for all rows to render
    await new Promise((r) => setTimeout(r, 2000));

    // Extract all rows from #marketWatchTable1
    console.log("[Scraper] Extracting table data...");
    const rowsData = await page.evaluate(() => {
      const table = document.querySelector("#marketWatchTable1");
      if (!table) return [];

      const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
      const result: string[][] = [];

      for (const row of bodyRows) {
        const cells = Array.from(row.querySelectorAll("td"));
        // Valid data rows have 15 cells
        if (cells.length < 10) continue;
        result.push(cells.map((cell) => (cell.textContent || "").trim()));
      }

      return result;
    });

    console.log(`[Scraper] Found ${rowsData.length} data rows`);

    if (rowsData.length === 0) {
      return {
        success: false,
        records: [],
        error: "No data rows found in #marketWatchTable1",
      };
    }

    // Parse rows using fixed column positions
    const records: StockRecordInput[] = [];

    for (const row of rowsData) {
      // Skip rows with empty company field
      if (!row[0] || row[0] === "-") continue;

      const { companyName, symbol } = parseCompanyCell(row[0]);
      const currentPrice = parseNumber(row[2] || "");
      const { low: week52Low, high: week52High } = parse52WeekRange(row[1] || "", currentPrice);

      const record: StockRecordInput = {
        symbol,
        companyName,
        week52Low,
        week52High,
        lastTradePrice: parseNumber(row[2] || ""),
        lastTradeVolume: parseInteger(row[3] || ""),
        lastTradeChange: parseNumber(row[4] || ""),
        lastTradePctChange: parseNumber(row[5] || ""),
        numberOfTrades: parseInteger(row[6] || ""),
        cumulativeVolume: parseInteger(row[7] || ""),
        todayOpen: parseNumber(row[8] || ""),
        todayHigh: parseNumber(row[9] || ""),
        todayLow: parseNumber(row[10] || ""),
        bestBidPrice: parseNumber(row[11] || ""),
        bestBidQuantity: parseInteger(row[12] || ""),
        bestOfferPrice: parseNumber(row[13] || ""),
        bestOfferQuantity: parseInteger(row[14] || ""),
      };

      records.push(record);
    }

    console.log(`[Scraper] Parsed ${records.length} valid records`);
    if (records.length > 0) {
      console.log(`[Scraper] Sample: ${records[0].companyName} (${records[0].symbol}) - Price: ${records[0].lastTradePrice}`);
    }

    return { success: true, records };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Scraper] Error:", message);
    return { success: false, records: [], error: message };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
