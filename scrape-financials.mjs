import puppeteer from 'puppeteer';
import pg from 'pg';
import { randomBytes } from 'crypto';
function cuid() { return 'c' + randomBytes(12).toString('hex'); }

const DB = process.env.DATABASE_URL_UNPOOLED || 'postgresql://neondb_owner:npg_RmTk5BPMXa1W@ep-falling-leaf-am6jg8ns.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

const IS_KEYS = ['Total Revenue (Sales/Operating)','Net Profit (Loss) before Zakat and Tax','Zakat and Income Tax','Net Profit (Loss) Attributable to Shareholders of the Issuer','Total Comprehensive Income Attributable to Shareholders of the Issuer','Profit (Loss) per Share'];
const CF_KEYS = ['Net Cash From Operating Activities','Net Cash From Investing Activities','Net Cash From Financing Activities','Cash and Cash Equivalents, Beginning of the Period','Cash and Cash Equivalents, End of the Period'];

function classifyRow(label) {
  if (IS_KEYS.includes(label)) return 'incomeStatement';
  if (CF_KEYS.includes(label)) return 'cashFlows';
  return 'balanceSheet';
}

const ALL_SYMBOLS = ['1010','1020','1030','1050','1060','1080','1111','1120','1140','1150','1180','1182','1183','1201','1202','1210','1211','1212','1213','1214','1301','1302','1303','1304','1320','1321','1322','1323','1324','1810','1820','1830','1831','1832','1833','1834','1835','2001','2010','2020','2030','2040','2050','2060','2070','2080','2081','2082','2083','2084','2090','2100','2110','2120','2130','2140','2150','2160','2170','2180','2190','2200','2210','2220','2222','2223','2230','2240','2250','2270','2280','2281','2282','2283','2284','2285','2286','2287','2288','2290','2300','2310','2320','2330','2340','2350','2360','2370','2380','2381','2382','3002','3003','3004','3005','3007','3008','3010','3020','3030','3040','3050','3060','3080','3090','3091','3092','4001','4002','4003','4004','4005','4006','4007','4008','4009','4011','4012','4013','4014','4015','4016','4017','4018','4019','4020','4021','4030','4031','4040','4050','4051','4061','4070','4071','4072','4080','4081','4082','4083','4084','4090','4100','4110','4130','4140','4141','4142','4143','4144','4145','4146','4147','4148','4150','4160','4161','4162','4163','4164','4165','4170','4180','4190','4191','4192','4193','4194','4200','4210','4220','4230','4240','4250','4260','4261','4262','4263','4264','4265','4270','4280','4290','4291','4292','4300','4310','4320','4321','4322','4323','4324','4325','4326','4327','4330','4331','4332','4333','4334','4335','4336','4337','4338','4339','4340','4342','4344','4345','4346','4347','4348','4349','4350','5110','6001','6002','6004','6010','6012','6013','6014','6015','6016','6017','6018','6019','6020','6040','6050','6060','6070','6090','7010','7020','7030','7040','7200','7201','7202','7203','7204','7211','8010','8012','8020','8030','8040','8050','8060','8070','8100','8120','8150','8160','8170','8180','8190','8200','8210','8230','8240','8250','8260','8280','8300','8310','8311','8313'];

const URL_BASE = 'https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz83d2MXA0C3SydAl1c3Q0NvE30I4EKzBEKDMKcTQzMDPxN3H19LAzdTU31w8syU8v1wwkpK8hOMgUA-oskdg!!/?companySymbol=';

async function main() {
  const pool = new pg.Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const startTime = Date.now();
  let completed = 0, totalStatements = 0, failed = 0;

  for (const symbol of ALL_SYMBOLS) {
    completed++;
    process.stdout.write(`[${completed}/${ALL_SYMBOLS.length}] ${symbol}... `);

    try {
      await page.goto(URL_BASE + symbol, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const rawTables = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        function extract(t) {
          if (!t) return null;
          const headers = Array.from(t.querySelectorAll('thead th, thead td')).map(h => h.textContent?.trim());
          const rows = Array.from(t.querySelectorAll('tbody tr')).map(r =>
            Array.from(r.querySelectorAll('td, th')).map(c => c.textContent?.trim())
          );
          return { headers, rows };
        }
        return [extract(tables[5]), extract(tables[6]), extract(tables[7])];
      });

      let symStatements = 0;

      for (let ti = 0; ti < rawTables.length; ti++) {
        const table = rawTables[ti];
        if (!table || table.rows.length < 3) continue;
        const type = (ti === 1) ? 'quarterly' : 'annual';
        const dates = [...new Set(table.headers.filter(h => h && /\d{4}-\d{2}-\d{2}/.test(h)))].slice(0, 4);
        const unitRow = table.rows.find(r => r[0] === 'All Figures in');
        const unit = unitRow ? unitRow[1] : 'Thousands';

        for (let di = 0; di < dates.length; di++) {
          const period = dates[di];
          const colIdx = di + 1;
          const bs = {}, is = {}, cf = {};

          for (const row of table.rows) {
            const label = row[0];
            const value = row[colIdx];
            if (!label || !value || value === '-' || ['All Figures in','All Currency In','Last Update Date'].includes(label)) continue;
            const section = classifyRow(label);
            if (section === 'incomeStatement') is[label] = value;
            else if (section === 'cashFlows') cf[label] = value;
            else bs[label] = value;
          }

          if (Object.keys(bs).length + Object.keys(is).length + Object.keys(cf).length > 0) {
            const data = { unit, balanceSheet: bs, incomeStatement: is, cashFlows: cf };
            await pool.query(
              `INSERT INTO "FinancialStatement" (id, symbol, period, type, data, "scrapedAt") VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT (symbol, period, type) DO UPDATE SET data=EXCLUDED.data, "scrapedAt"=NOW()`,
              [cuid(), symbol, period, type, JSON.stringify(data)]
            );
            symStatements++;
          }
        }
      }

      totalStatements += symStatements;
      console.log(`${symStatements} statements`);
    } catch (e) {
      console.log(`ERROR: ${(e.message || '').substring(0, 50)}`);
      failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n=== DONE === ${totalStatements} statements for ${completed - failed}/${ALL_SYMBOLS.length} stocks in ${elapsed} min (${failed} failed)`);
  await browser.close();
  await pool.end();
}

main().catch(e => console.error('Fatal:', e.message));
