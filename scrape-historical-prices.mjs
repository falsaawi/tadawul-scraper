/**
 * Historical price scraper - uses Puppeteer to interact with the form and scrape all pages.
 * Run: DATABASE_URL_UNPOOLED="postgresql://..." node scrape-historical-prices.mjs
 */

import puppeteer from 'puppeteer';
import pg from 'pg';
import { randomBytes } from 'crypto';

function cuid() { return 'c' + randomBytes(12).toString('hex'); }

const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tadawul';
const PAGE_URL = 'https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/reports-publications/historical-reports/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz8DTxCnA3MDILdzUJDLAyNXE30I4EKzHEqMDTTD9aP0o8qTs1JTS5JTfFNLMpOLdGP9HX09EMWd80rySyp1I80AgL9cEJGFmQnJlWlVToCAIqKZ6o!/';

const SECTOR_MAP = {
  "Energy": { code: "TENI:31", symbols: ["2030","2222","2380","2381","2382","4030"] },
  "Materials": { code: "TMTI:32", symbols: ["1201","1202","1210","1211","1301","1304","1320","1321","1322","1323","1324","2001","2010","2020","2060","2090","2150","2170","2180","2200","2210","2220","2223","2240","2250","2290","2300","2310","2330","2350","2360","3002","3003","3004","3005","3007","3008","3010","3020","3030","3040","3050","3060","3080","3090","3091","3092","4143"] },
  "Capital Goods": { code: "TCGI:33", symbols: ["1212","1214","1302","1303","2040","2110","2160","2320","2370","4110","4140","4141","4142","4144","4145","4146","4147","4148"] },
  "Commercial & Professional Svc": { code: "TCPI:34", symbols: ["1831","1832","1833","1834","1835","4270","6004"] },
  "Transportation": { code: "TTRI:35", symbols: ["2190","4031","4040","4260","4261","4262","4263","4264","4265"] },
  "Consumer Durables & Apparel": { code: "TCDI:37", symbols: ["1213","2130","2340","4011","4012","4180"] },
  "Consumer Services": { code: "TCSI:38", symbols: ["1810","1820","1830","4170","4290","4291","4292","6002","6012","6013","6014","6015","6016","6017","6018","6019"] },
  "Media and Entertainment": { code: "TMEI:39", symbols: ["4070","4071","4072","4210"] },
  "Consumer Discretionary Distribution & Retail": { code: "TDRI:40", symbols: ["4003","4008","4050","4051","4190","4191","4192","4193","4194","4200","4240"] },
  "Consumer Staples Distribution & Retail": { code: "TSRI:41", symbols: ["4001","4006","4061","4160","4161","4162","4163","4164"] },
  "Food & Beverages": { code: "TFBI:42", symbols: ["2050","2100","2270","2280","2281","2282","2283","2284","2285","2286","2287","2288","4080","6001","6010","6020","6040","6050","6060","6070","6090"] },
  "Household & Personal Products": { code: "THPI:43", symbols: ["4165"] },
  "Health Care Equipment & Svc": { code: "THCI:44", symbols: ["2140","2230","4002","4004","4005","4007","4009","4013","4014","4017","4018","4019","4021"] },
  "Pharma, Biotech & Life Science": { code: "TPBI:45", symbols: ["2070","4015","4016"] },
  "Banks": { code: "TBKI:46", symbols: ["1010","1020","1030","1050","1060","1080","1120","1140","1150","1180"] },
  "Financial Services": { code: "TFSI:47", symbols: ["1111","1182","1183","2120","4081","4082","4083","4084","4130","4280"] },
  "Insurance": { code: "TINI:48", symbols: ["8010","8012","8020","8030","8040","8050","8060","8070","8100","8120","8150","8160","8170","8180","8190","8200","8210","8230","8240","8250","8260","8280","8300","8310","8311","8313"] },
  "Software & Services": { code: "TSSI:49", symbols: ["7200","7201","7202","7203","7204","7211"] },
  "Telecommunication Services": { code: "TTSI:52", symbols: ["7010","7020","7030","7040"] },
  "Utilities": { code: "TUTI:53", symbols: ["2080","2081","2082","2083","2084","5110"] },
  "REITs": { code: "TRTI:21", symbols: ["4330","4331","4332","4333","4334","4335","4336","4337","4338","4339","4340","4342","4344","4345","4346","4347","4348","4349","4350"] },
  "Real Estate Mgmt & Dev't": { code: "TREI:54", symbols: ["4020","4090","4100","4150","4220","4230","4250","4300","4310","4320","4321","4322","4323","4324","4325","4326","4327"] },
};

function getSectorCode(symbol) {
  for (const [, data] of Object.entries(SECTOR_MAP)) {
    if (data.symbols.includes(symbol)) return data.code;
  }
  return "TENI:31";
}

function parseNum(s) { if (!s || s === '-') return null; const n = parseFloat(s.replace(/,/g, '')); return isNaN(n) ? null : n; }
function parseBigInt(s) { if (!s || s === '-') return null; const n = parseInt(s.replace(/,/g, ''), 10); return isNaN(n) ? null : n; }

async function main() {
  console.log('=== Historical Price Scraper (Table Approach) ===');

  const isLocal = DB_URL.includes('localhost');
  const pool = new pg.Pool({ connectionString: DB_URL, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });

  const allSymbols = Object.values(SECTOR_MAP).flatMap(s => s.symbols);
  console.log(`Stocks: ${allSymbols.length}\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

  console.log('Loading page...');
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  let completed = 0, totalRecords = 0, failed = 0;

  for (const symbol of allSymbols) {
    completed++;
    const sectorCode = getSectorCode(symbol);
    process.stdout.write(`[${completed}/${allSymbols.length}] ${symbol}... `);

    try {
      // Select market, sector, company, dates via page interaction
      await page.evaluate((sym, sector) => {
        // Use bootstrap-select API if available, otherwise set values directly
        const marketSel = document.querySelector('#marketOrIndices');
        if (marketSel) { marketSel.value = 'MAIN'; marketSel.dispatchEvent(new Event('change', {bubbles: true})); }
      }, symbol, sectorCode);
      await new Promise(r => setTimeout(r, 1000));

      await page.evaluate((sector) => {
        const sectorSel = document.querySelector('#sectors');
        if (sectorSel) { sectorSel.value = sector; sectorSel.dispatchEvent(new Event('change', {bubbles: true})); }
      }, sectorCode);
      await new Promise(r => setTimeout(r, 1500));

      // Wait for entity dropdown to populate
      await page.evaluate((sym) => {
        const entitySel = document.querySelector('#entity');
        if (entitySel) {
          // Check if the option exists
          let found = false;
          for (const opt of entitySel.options) { if (opt.value === sym) { found = true; break; } }
          if (found) { entitySel.value = sym; entitySel.dispatchEvent(new Event('change', {bubbles: true})); }
        }
      }, symbol);
      await new Promise(r => setTimeout(r, 1000));

      // Set dates
      await page.evaluate(() => {
        const start = document.querySelector('#startTimePeriod');
        const end = document.querySelector('#endTimePeriod');
        if (start) { start.value = '01-01-2010'; }
        if (end) { end.value = '10-04-2026'; }
      });

      // Wait for table to load
      await page.waitForSelector('#perfSummary tbody tr', { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      // Scrape the table - read all visible rows from #unadjustedPrice (tab 1)
      const rows = await page.evaluate(() => {
        const table = document.querySelector('#perfSummary') || document.querySelector('#unadjustedPrice');
        if (!table) return [];
        return Array.from(table.querySelectorAll('tbody tr')).map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.map(c => c.textContent?.trim() || '');
        }).filter(r => r.length >= 8 && r[0]);
      });

      if (rows.length === 0) { console.log('NO DATA'); continue; }

      // Insert rows
      let inserted = 0;
      for (const r of rows) {
        const date = r[0]; // YYYY-MM-DD format
        if (!date || date.length < 8) continue;
        try {
          await pool.query(
            `INSERT INTO "HistoricalPrice" (id, symbol, date, open, high, low, close, change, "changePct", volume, value, trades)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (symbol, date) DO NOTHING`,
            [cuid(), symbol, date, parseNum(r[1]), parseNum(r[2]), parseNum(r[3]), parseNum(r[4]),
             parseNum(r[5]), parseNum(r[6]), parseBigInt(r[7]), parseNum(r[8]), parseBigInt(r[9])]
          );
          inserted++;
        } catch (e) { /* skip */ }
      }

      totalRecords += inserted;
      console.log(`${inserted} records`);

    } catch (e) {
      console.log(`ERROR: ${e.message?.substring(0, 60)}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  await pool.end();
  console.log(`\n=== DONE === ${completed - failed}/${allSymbols.length} succeeded, ${totalRecords} total records, ${failed} failed`);
}

main().catch(e => console.error('Fatal:', e.message));
