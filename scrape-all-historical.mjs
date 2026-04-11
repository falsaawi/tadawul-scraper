import puppeteer from 'puppeteer';
import pg from 'pg';
import { randomBytes } from 'crypto';
function cuid() { return 'c' + randomBytes(12).toString('hex'); }
function parseNum(s) { if (!s || s === '-') return null; const n = parseFloat(s.replace(/,/g, '')); return isNaN(n) ? null : n; }
function parseBigInt(s) { if (!s || s === '-') return null; const n = parseInt(s.replace(/,/g, ''), 10); return isNaN(n) ? null : n; }
function extractChange(html) { if (!html) return null; const m = String(html).match(/>([+-]?\d+\.?\d*)</); if (m) return parseFloat(m[1]); const m2 = String(html).match(/([+-]?\d+\.?\d*)/); return m2 ? parseFloat(m2[1]) : null; }

const DB = process.env.DATABASE_URL_UNPOOLED || 'postgresql://neondb_owner:npg_RmTk5BPMXa1W@ep-falling-leaf-am6jg8ns.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const PAGE_URL = 'https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/reports-publications/historical-reports/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz8DTxCnA3MDILdzUJDLAyNXE30I4EKzHEqMDTTD9aP0o8qTs1JTS5JTfFNLMpOLdGP9HX09EMWd80rySyp1I80AgL9cEJGFmQnJlWlVToCAIqKZ6o!/';

const SECTORS = {
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

async function batchInsert(pool, rows) {
  if (rows.length === 0) return 0;
  const values = []; const params = []; let idx = 1;
  for (const r of rows) {
    values.push('(' + Array.from({length:12},()=>'$'+ idx++).join(',') + ')');
    params.push(r.id,r.symbol,r.date,r.open,r.high,r.low,r.close,r.change,r.changePct,r.volume,r.value,r.trades);
  }
  await pool.query('INSERT INTO "HistoricalPrice" (id,symbol,date,open,high,low,close,change,"changePct",volume,value,trades) VALUES '+values.join(',')+' ON CONFLICT (symbol,date) DO UPDATE SET open=EXCLUDED.open,high=EXCLUDED.high,low=EXCLUDED.low,close=EXCLUDED.close,change=EXCLUDED.change,"changePct"=EXCLUDED."changePct",volume=EXCLUDED.volume,value=EXCLUDED.value,trades=EXCLUDED.trades', params);
  return rows.length;
}

(async () => {
  const pool = new pg.Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  let apiUrl = '';
  page.on('request', (req) => { if (req.url().includes('populateCompanyDetails') && req.method() === 'POST') apiUrl = req.url(); });
  console.log('Loading page...');
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  if (!apiUrl) apiUrl = await page.evaluate(() => { const e = performance.getEntriesByType('resource').filter(r => r.name.includes('populateCompanyDetails')); return e.length > 0 ? e[0].name : ''; });

  // Skip symbols already scraped (1000+ records)
  const existing = {};
  const res = await pool.query('SELECT symbol, COUNT(*)::int as cnt FROM "HistoricalPrice" GROUP BY symbol');
  for (const row of res.rows) existing[row.symbol] = row.cnt;

  const allJobs = [];
  for (const [sector, symbols] of Object.entries(SECTORS)) {
    for (const sym of symbols) {
      if ((existing[sym] || 0) >= 1000) continue;
      allJobs.push({ symbol: sym, sector });
    }
  }

  const skipped = Object.keys(existing).filter(s => existing[s] >= 1000).length;
  console.log('Already done: ' + skipped + ' stocks (skipping)');
  console.log('Remaining: ' + allJobs.length + ' stocks\n');

  let completed = 0, grandTotal = 0, failed = 0;
  const startTime = Date.now();

  for (const job of allJobs) {
    completed++;
    const symStart = Date.now();
    process.stdout.write('[' + completed + '/' + allJobs.length + '] ' + job.symbol + '... ');
    let totalInserted = 0, start = 0, totalRecords = 0;

    try {
      while (true) {
        const result = await page.evaluate(async (url, startIdx, sym, sector) => {
          const fd = new URLSearchParams();
          fd.append('draw','1');
          const cols=['transactionDateStr','todaysOpen','highPrice','lowPrice','previousClosePrice','change','changePercent','volumeTraded','turnOver','noOfTrades'];
          for(let i=0;i<10;i++){fd.append('columns['+i+'][data]',cols[i]);fd.append('columns['+i+'][name]','');fd.append('columns['+i+'][searchable]','true');fd.append('columns['+i+'][orderable]','false');fd.append('columns['+i+'][search][value]','');fd.append('columns['+i+'][search][regex]','false');}
          fd.append('start',String(startIdx));fd.append('length','100');
          fd.append('search[value]','');fd.append('search[regex]','false');
          fd.append('selectedMarket','MAIN');fd.append('selectedSector',sector);fd.append('selectedEntity',sym);
          fd.append('startDate','01-01-2010');fd.append('endDate','10-04-2026');
          fd.append('tableTabId','0');fd.append('startIndex','0');fd.append('endIndex','30');
          const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:fd.toString()});
          return await res.json();
        }, apiUrl, start, job.symbol, job.sector);

        totalRecords = result.recordsFiltered || 0;
        const records = result.data || [];
        if (records.length === 0) break;

        const batch = records.filter(r=>r.transactionDateStr).map(r=>({
          id:cuid(),symbol:job.symbol,date:r.transactionDateStr,
          open:parseNum(r.todaysOpen),high:parseNum(r.highPrice),low:parseNum(r.lowPrice),
          close:parseNum(r.previousClosePrice),change:extractChange(r.change),changePct:extractChange(r.changePercent),
          volume:parseBigInt(r.volumeTraded),value:parseNum(r.turnOver),trades:parseBigInt(r.noOfTrades),
        }));
        totalInserted += await batchInsert(pool, batch);
        start += records.length;
        if (start >= totalRecords) break;
        await new Promise(r => setTimeout(r, 200));
      }
      grandTotal += totalInserted;
      console.log(totalInserted + ' in ' + ((Date.now()-symStart)/1000).toFixed(1) + 's');
    } catch(e) {
      console.log('ERROR: ' + (e.message || '').substring(0,60));
      failed++;
    }
  }

  await browser.close();
  await pool.end();
  console.log('\n=== DONE === ' + grandTotal + ' records, ' + (completed-failed) + '/' + allJobs.length + ' stocks, ' + ((Date.now()-startTime)/1000/60).toFixed(1) + ' min, ' + failed + ' failed');
})().catch(e => console.error('Fatal:', e.message));
