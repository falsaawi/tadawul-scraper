// Client-side parser for the broker dividend export (.xlsx).
// Parsing happens in the browser so the multi-MB file never hits the API
// body limit.

import * as XLSX from "xlsx";

export interface ParsedDividend {
  company: string;
  value: number;
  perShare: number | null;
  units: number | null;
  distDate: string | null; // ISO yyyy-mm-dd
  eligibilityDate: string | null;
  announceDate: string | null;
  type: string | null;
  status: string | null;
}

export interface ParsedDividendFile {
  fileName: string;
  rows: ParsedDividend[];
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[,\s%]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

// DD/MM/YYYY -> yyyy-mm-dd, or Excel serial -> ISO. null on failure.
function parseDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n > 25000 && n < 70000) {
    const date = XLSX.SSF.parse_date_code(n);
    if (date) {
      const y = String(date.y);
      const mo = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
  }
  return null;
}

export async function parseDividendWorkbook(file: File): Promise<ParsedDividendFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });

  // Column layout observed in the broker xlsx (0-indexed):
  // 2  = total value, 9  = status, 12 = per share, 14 = units,
  // 17 = dist date,    20 = eligibility, 24 = announce date,
  // 32 = type,         37 = company name (Ar)
  const out: ParsedDividend[] = [];
  for (const row of rows) {
    const company = toStr(row[37]);
    const value = toNumber(row[2]);
    const dist = toStr(row[17]);
    if (!company || company === "شركة" || value == null || !dist) continue;
    out.push({
      company,
      value,
      perShare: toNumber(row[12]),
      units: toNumber(row[14]),
      distDate: parseDate(dist),
      eligibilityDate: parseDate(row[20]),
      announceDate: parseDate(row[24]),
      type: toStr(row[32]) || null,
      status: toStr(row[9]) || null,
    });
  }

  return { fileName: file.name, rows: out };
}
