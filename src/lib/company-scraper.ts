import { getBrowser } from "./browser";

const PROFILE_URL_BASE =
  "https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz83d2MXA0C3SydAl1c3Q0NvE30I4EKzBEKDMKcTQzMDPxN3H19LAzdTU31w8syU8v1wwkpK8hOMgUA-oskdg!!/?companySymbol=";

const DIVIDENDS_PAGE_URL =
  "https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-financial-calendars/dividends/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz8LTw8zA0C3bw9LTyDvAwMAoz1I4EKzBEK_H0DnQ3MDEyCQs3CXAwNvIz1g_Wj9KOSKoMrc5Pyc_QjjYAAJJKbWJSdWhJSWZDqnJGanK0f6asfTsioguzEpKq0SkcAIkCqoA!!/";

export interface CompanyProfileData {
  symbol: string;
  companyName: string;
  sector: string | null;
  details: Record<string, string>;
  announcements: Array<{ title: string; date: string | null; category: string | null }>;
  dividends: Array<{
    announcedDate: string | null;
    eligibilityDate: string | null;
    distributionDate: string | null;
    distributionWay: string | null;
    dividendAmount: string | null;
  }>;
  boardMembers: Array<{
    tradingDate: string | null;
    shareholder: string | null;
    designation: string | null;
    sharesHeld: string | null;
    sharesPrev: string | null;
    sharesChange: string | null;
  }>;
  corporateActions: Array<{ title: string; date: string | null; details: string | null }>;
}

export async function scrapeCompanyProfile(symbol: string): Promise<CompanyProfileData> {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // ====== STEP 1: Scrape company profile page ======
    console.log(`[CompanyScraper] Scraping profile for ${symbol}...`);
    await page.goto(PROFILE_URL_BASE + symbol, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));

    const profileData = await page.evaluate(() => {
      const result: {
        companyName: string;
        details: Record<string, string>;
        announcements: Array<{ title: string; date: string | null; category: string | null }>;
        boardMembers: Array<{ tradingDate: string | null; shareholder: string | null; designation: string | null; sharesHeld: string | null; sharesPrev: string | null; sharesChange: string | null }>;
        corporateActions: Array<{ title: string; date: string | null; details: string | null }>;
      } = {
        companyName: "",
        details: {},
        announcements: [],
        boardMembers: [],
        corporateActions: [],
      };

      // Company name
      const headings = document.querySelectorAll("h2, h3, h4");
      for (const h of headings) {
        const text = h.textContent?.trim() || "";
        if (text.length > 3 && text.length < 100 && !text.includes("Log in") && !text.includes("Forgot") && !text.includes("Prices") && !text.includes("companyprofile")) {
          result.companyName = text;
          break;
        }
      }

      // Company details from #company_table1
      const detailsTable = document.querySelector("#company_table1");
      if (detailsTable) {
        const rows = detailsTable.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            const key = cells[0].textContent?.trim() || "";
            const val = cells[1].textContent?.trim() || "";
            if (key && val) result.details[key] = val;
          }
        });
      }

      // Announcements — extract all <li> items from the announcement_Box
      const annBox = document.querySelector(".announcement_Box");
      if (annBox) {
        const listItems = annBox.querySelectorAll("li");
        listItems.forEach((li) => {
          const h2 = li.querySelector("h2");
          const title = h2?.textContent?.trim() || "";
          if (!title || title.length < 5) return;

          const fullText = li.textContent || "";
          const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
          result.announcements.push({ title: title.substring(0, 500), date: dateMatch ? dateMatch[1] : null, category: null });
        });
      }

      // Board / Shareholding — find table with shareholders headers
      const allTables = document.querySelectorAll("table");
      for (const table of allTables) {
        const headers = Array.from(table.querySelectorAll("thead th")).map((h) => h.textContent?.trim().toLowerCase() || "");
        if (headers.some((h) => h.includes("shareholder")) && headers.some((h) => h.includes("designation"))) {
          const rows = table.querySelectorAll("tbody tr");
          rows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll("td")).map((c) => c.textContent?.trim() || null);
            if (cells.length >= 4) {
              result.boardMembers.push({
                tradingDate: cells[0],
                shareholder: cells[1],
                designation: cells[2],
                sharesHeld: cells[3],
                sharesPrev: cells[4] || null,
                sharesChange: cells[5] || null,
              });
            }
          });
          break;
        }
      }

      // Corporate Actions
      const corpSection = document.querySelector(".announcement_corporate:not(.dividends)");
      if (corpSection) {
        const boxes = corpSection.querySelectorAll(".announcement_Box li, .announcement_Box");
        const seen = new Set<string>();
        boxes.forEach((box) => {
          const h2 = box.querySelector("h2");
          const title = h2?.textContent?.trim() || box.textContent?.trim().substring(0, 300) || "";
          if (title.length > 5 && !seen.has(title)) {
            seen.add(title);
            const dateMatch = (box.textContent || "").match(/(\d{2}\/\d{2}\/\d{4})/);
            result.corporateActions.push({ title, date: dateMatch?.[1] || null, details: null });
          }
        });
      }

      return result;
    });

    console.log(`[CompanyScraper] Profile: ${profileData.companyName}, ${profileData.announcements.length} announcements, ${profileData.boardMembers.length} board members`);

    // ====== STEP 2: Scrape dividends from the dedicated dividends page ======
    console.log(`[CompanyScraper] Scraping dividends for ${symbol}...`);
    await page.goto(DIVIDENDS_PAGE_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Wait for the table
    await page.waitForSelector("#issuerTable", { timeout: 15000 }).catch(() => {});

    // Filter the dividends table by typing the symbol
    const dividends = await page.evaluate((sym) => {
      const table = document.querySelector("#issuerTable");
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll("tbody tr"));
      const results: Array<{
        announcedDate: string | null;
        eligibilityDate: string | null;
        distributionDate: string | null;
        distributionWay: string | null;
        dividendAmount: string | null;
      }> = [];

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td")).map((c) => c.textContent?.trim() || "");
        // Column 0 = Symbol, check if it matches
        if (cells[0] === sym) {
          results.push({
            announcedDate: cells[2] || null, // Announcement Date
            eligibilityDate: cells[3] || null, // Eligibility Date
            distributionWay: cells[4] || null, // Distribution Method
            distributionDate: cells[5] || null, // Distribution Date
            dividendAmount: cells[6] || null, // Dividend Amount
          });
        }
      }

      return results;
    }, symbol);

    console.log(`[CompanyScraper] Found ${dividends.length} historical dividends for ${symbol}`);

    return {
      symbol,
      companyName: profileData.companyName || symbol,
      sector: null,
      details: profileData.details,
      announcements: profileData.announcements,
      dividends,
      boardMembers: profileData.boardMembers,
      corporateActions: profileData.corporateActions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CompanyScraper] Error scraping ${symbol}:`, message);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
