/**
 * Batch scraper — scrapes all company profiles and dividends.
 * Run: node scrape-all-companies.mjs
 *
 * This populates the Neon database with all company data.
 */

import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const DIVIDENDS_PAGE_URL =
  'https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-financial-calendars/dividends/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz8LTw8zA0C3bw9LTyDvAwMAoz1I4EKzBEK_H0DnQ3MDEyCQs3CXAwNvIz1g_Wj9KOSKoMrc5Pyc_QjjYAAJJKbWJSdWhJSWZDqnJGanK0f6asfTsioguzEpKq0SkcAIkCqoA!!/';

const PROFILE_URL_BASE =
  'https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz83d2MXA0C3SydAl1c3Q0NvE30I4EKzBEKDMKcTQzMDPxN3H19LAzdTU31w8syU8v1wwkpK8hOMgUA-oskdg!!/?companySymbol=';

// Get list of all stocks from the API
async function getStockList() {
  const res = await fetch(`${BASE_URL}/api/company?list=true`);
  const data = await res.json();
  return data.allStocks || [];
}

// Scrape all dividends from the dedicated page
async function scrapeAllDividends(browser) {
  console.log('\n=== SCRAPING ALL DIVIDENDS ===');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  await page.goto(DIVIDENDS_PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.waitForSelector('#issuerTable', { timeout: 15000 }).catch(() => {});

  const dividends = await page.evaluate(() => {
    const table = document.querySelector('#issuerTable');
    if (!table) return {};

    const bySymbol = {};
    const rows = table.querySelectorAll('tbody tr');
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '');
      const symbol = cells[0];
      if (!symbol) continue;
      if (!bySymbol[symbol]) bySymbol[symbol] = [];
      bySymbol[symbol].push({
        announcedDate: cells[2] || null,
        eligibilityDate: cells[3] || null,
        distributionWay: cells[4] || null,
        distributionDate: cells[5] || null,
        dividendAmount: cells[6] || null,
      });
    }
    return bySymbol;
  });

  await page.close();

  const totalDivs = Object.values(dividends).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Found ${totalDivs} dividends across ${Object.keys(dividends).length} companies`);
  return dividends;
}

// Scrape a single company profile (announcements, board, corporate actions)
async function scrapeCompanyProfile(browser, symbol) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    await page.goto(PROFILE_URL_BASE + symbol, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const result = { companyName: '', announcements: [], boardMembers: [], corporateActions: [] };

      // Company name
      const headings = document.querySelectorAll('h2, h3, h4');
      for (const h of headings) {
        const text = h.textContent?.trim() || '';
        if (text.length > 3 && text.length < 100 && !text.includes('Log in') && !text.includes('Forgot') && !text.includes('Prices') && !text.includes('companyprofile')) {
          result.companyName = text;
          break;
        }
      }

      // Announcements
      const annBox = document.querySelector('.announcement_Box');
      if (annBox) {
        annBox.querySelectorAll('li').forEach(li => {
          const h2 = li.querySelector('h2');
          const title = h2?.textContent?.trim() || '';
          if (title.length < 5) return;
          const dateMatch = (li.textContent || '').match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
          result.announcements.push({ title: title.substring(0, 500), date: dateMatch?.[1] || null, category: null });
        });
      }

      // Board
      const allTables = document.querySelectorAll('table');
      for (const table of allTables) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent?.trim().toLowerCase() || '');
        if (headers.some(h => h.includes('shareholder')) && headers.some(h => h.includes('designation'))) {
          table.querySelectorAll('tbody tr').forEach(row => {
            const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || null);
            if (cells.length >= 4) {
              result.boardMembers.push({
                tradingDate: cells[0], shareholder: cells[1], designation: cells[2],
                sharesHeld: cells[3], sharesPrev: cells[4] || null, sharesChange: cells[5] || null,
              });
            }
          });
          break;
        }
      }

      // Corporate Actions
      const corpSection = document.querySelector('.announcement_corporate:not(.dividends)');
      if (corpSection) {
        const seen = new Set();
        corpSection.querySelectorAll('.announcement_Box li, .announcement_Box').forEach(box => {
          const h2 = box.querySelector('h2');
          const title = h2?.textContent?.trim() || box.textContent?.trim().substring(0, 300) || '';
          if (title.length > 5 && !seen.has(title)) {
            seen.add(title);
            const dateMatch = (box.textContent || '').match(/(\d{2}\/\d{2}\/\d{4})/);
            result.corporateActions.push({ title, date: dateMatch?.[1] || null, details: null });
          }
        });
      }

      return result;
    });

    return data;
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return { companyName: '', announcements: [], boardMembers: [], corporateActions: [] };
  } finally {
    await page.close();
  }
}

// Save a company profile via the API
async function saveCompanyProfile(symbol, companyName, profileData, dividends) {
  // First, try to scrape via the API (which handles DB operations)
  const res = await fetch(`${BASE_URL}/api/company/scrape?symbol=${symbol}`, { method: 'POST' });
  return res.ok;
}

async function main() {
  console.log('=== Tadawul Batch Company Scraper ===');
  console.log(`Server: ${BASE_URL}\n`);

  // Get stock list
  const stocks = await getStockList();
  console.log(`Found ${stocks.length} stocks to scrape\n`);

  if (stocks.length === 0) {
    console.log('No stocks found. Make sure the dev server is running and has market data.');
    return;
  }

  // Scrape all companies via the API (one at a time)
  let completed = 0;
  let failed = 0;

  for (const stock of stocks) {
    completed++;
    process.stdout.write(`[${completed}/${stocks.length}] ${stock.symbol} - ${stock.companyName}... `);

    try {
      const res = await fetch(`${BASE_URL}/api/company/scrape?symbol=${stock.symbol}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        console.log('OK');
      } else {
        console.log(`FAIL: ${data.error}`);
        failed++;
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      failed++;
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== DONE ===`);
  console.log(`Completed: ${completed - failed}/${stocks.length}`);
  console.log(`Failed: ${failed}`);
}

main().catch(e => console.error('Fatal:', e.message));
