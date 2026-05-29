// Client-side parser for the broker investment workbook.
// Runs in the browser via SheetJS so large files dodge serverless body limits.

import * as XLSX from "xlsx";

export interface ParsedCash {
  capitalFirm: string;
  portfolio: string | null;
  amount: number;
}

export interface ParsedSaudiStock {
  capitalFirm: string;
  stockCode: string;
  qty: number;
  stockCost: number | null;
  totalCost: number | null;
  brokerMarketPrice: number | null;
  brokerCurrentValue: number | null;
}

export interface ParsedSaudiFund {
  capitalFirm: string;
  fundName: string;
  qty: number;
  costPerUnit: number | null;
  totalCost: number | null;
  closePrice: number | null;
  marketValue: number | null;
}

export interface ParsedUsaStock {
  ticker: string;
  qty: number;
  costValue: number | null;
  closePrice: number | null;
  marketValue: number | null;
  profitLoss: number | null;
}

export interface ParsedGulfStock {
  capitalFirm: string | null;
  market: string;
  stockCode: string;
  qty: number;
  marketPrice: number | null;
  currentValue: number | null;
}

export interface ParsedInvestment {
  fileName: string;
  cash: ParsedCash[];
  saudiStocks: ParsedSaudiStock[];
  saudiFunds: ParsedSaudiFund[];
  usaStocks: ParsedUsaStock[];
  gulfStocks: ParsedGulfStock[];
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function findSheet(wb: XLSX.WorkBook, candidates: string[]): unknown[][] | null {
  // Case-insensitive match against trimmed sheet names
  const map = new Map<string, string>();
  for (const n of wb.SheetNames) map.set(n.trim().toLowerCase(), n);
  for (const c of candidates) {
    const hit = map.get(c.trim().toLowerCase());
    if (hit) {
      return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[hit], {
        header: 1,
        raw: true,
        defval: "",
      });
    }
  }
  return null;
}

function parseCashSheet(rows: unknown[][]): ParsedCash[] {
  const out: ParsedCash[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firm = str(row[0]);
    const amount = num(row[2]);
    if (!firm || amount == null) continue;
    out.push({
      capitalFirm: firm,
      portfolio: str(row[1]) || null,
      amount,
    });
  }
  return out;
}

function parseSaudiStocksSheet(rows: unknown[][]): ParsedSaudiStock[] {
  const out: ParsedSaudiStock[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firm = str(row[0]);
    const code = str(row[1]);
    const qty = num(row[2]);
    if (!firm || !code || qty == null) continue;
    out.push({
      capitalFirm: firm,
      stockCode: code,
      qty,
      stockCost: num(row[3]),
      totalCost: num(row[4]),
      brokerMarketPrice: num(row[5]),
      brokerCurrentValue: num(row[6]),
    });
  }
  return out;
}

function parseSaudiFundsSheet(rows: unknown[][]): ParsedSaudiFund[] {
  const out: ParsedSaudiFund[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firm = str(row[0]);
    const name = str(row[1]);
    const qty = num(row[2]);
    if (!firm || !name || qty == null) continue;
    out.push({
      capitalFirm: firm,
      fundName: name,
      qty,
      costPerUnit: num(row[3]),
      totalCost: num(row[4]),
      closePrice: num(row[5]),
      marketValue: num(row[6]),
    });
  }
  return out;
}

function parseUsaStocksSheet(rows: unknown[][]): ParsedUsaStock[] {
  const out: ParsedUsaStock[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ticker = str(row[0]);
    const qty = num(row[1]);
    if (!ticker || qty == null) continue;
    out.push({
      ticker,
      qty,
      costValue: num(row[2]),
      closePrice: num(row[3]),
      marketValue: num(row[4]),
      profitLoss: num(row[5]),
    });
  }
  return out;
}

function parseGulfStocksSheet(rows: unknown[][]): ParsedGulfStock[] {
  const out: ParsedGulfStock[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const market = str(row[1]);
    const code = str(row[2]);
    const qty = num(row[3]);
    if (!market || !code || qty == null) continue;
    out.push({
      capitalFirm: str(row[0]) || null,
      market,
      stockCode: code,
      qty,
      marketPrice: num(row[4]),
      currentValue: num(row[5]),
    });
  }
  return out;
}

export async function parseInvestmentWorkbook(
  file: File
): Promise<ParsedInvestment> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });

  const cashRows = findSheet(wb, ["Investment Cash"]);
  const saudiRows = findSheet(wb, ["Saudi Stocks"]);
  const fundsRows = findSheet(wb, ["Saudi Funds"]);
  const usaRows = findSheet(wb, ["USA Stock", "USA Stocks"]);
  const gulfRows = findSheet(wb, ["Gulf Stocks"]);

  return {
    fileName: file.name,
    cash: cashRows ? parseCashSheet(cashRows) : [],
    saudiStocks: saudiRows ? parseSaudiStocksSheet(saudiRows) : [],
    saudiFunds: fundsRows ? parseSaudiFundsSheet(fundsRows) : [],
    usaStocks: usaRows ? parseUsaStocksSheet(usaRows) : [],
    gulfStocks: gulfRows ? parseGulfStocksSheet(gulfRows) : [],
  };
}
