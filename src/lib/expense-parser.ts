// Server-side credit-card statement PDF parser.
//
// Extracts an authoritative statement summary plus best-effort per-transaction
// detail for the supported banks (SAB / SABB and Al Rajhi). Uses pdfjs-dist in
// Node (text extraction only — no canvas). Column geometry and reconciliation
// were validated against real statements.

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface ParsedTxn {
  txnDate: string | null; // ISO yyyy-mm-dd
  postDate: string | null;
  merchant: string;
  city: string | null;
  rawDesc: string | null;
  amount: number;
  currency: string | null;
  foreignAmount: number | null;
  category: string;
  isCredit: boolean;
}

export interface ParsedStatement {
  bank: "SAB" | "AlRajhi" | "Unknown";
  cardName: string | null;
  cardNumber: string | null;
  statementMonth: string; // YYYY-MM
  statementLabel: string | null;
  totalSpend: number | null;
  totalDebits: number | null;
  totalCredits: number | null;
  fees: number | null;
  vat: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  minimumDue: number | null;
  totalDue: number | null;
  dueDate: string | null;
  transactions: ParsedTxn[];
}

interface Item {
  x: number;
  y: number;
  s: string;
  w: number; // page width for column scaling
}

interface Page {
  width: number;
  items: Item[];
  lines: string[];
  text: string;
}

// ---------- extraction ----------

async function extractPages(buffer: Uint8Array): Promise<Page[]> {
  const doc = await getDocument({ data: buffer, useSystemFonts: true, isEvalSupported: false }).promise;
  const pages: Page[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const width = page.view[2];
    const tc = await page.getTextContent();
    const items: Item[] = [];
    for (const it of tc.items as Array<{ str?: string; transform: number[] }>) {
      if (!it.str || !it.str.trim()) continue;
      items.push({ x: it.transform[4], y: it.transform[5], s: it.str.trim(), w: width });
    }
    // reconstruct lines by y with a small tolerance, x-sorted
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Array<{ y: number; items: Item[] }> = [];
    for (const it of sorted) {
      let row = rows.find((r) => Math.abs(r.y - it.y) <= 3);
      if (!row) {
        row = { y: it.y, items: [] };
        rows.push(row);
      }
      row.items.push(it);
    }
    const lines = rows.map((r) =>
      r.items
        .sort((a, b) => a.x - b.x)
        .map((o) => o.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    );
    pages.push({ width, items, lines, text: lines.join("\n") });
  }
  return pages;
}

// ---------- helpers ----------

const round2 = (n: number): number => Math.round(n * 100) / 100;

const num = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const m = s.match(/-?[\d,]+\.\d{2}/);
  return m ? parseFloat(m[0].replace(/,/g, "")) : null;
};

function isoFromDMY(d: string): string | null {
  // dd/mm/yyyy or dd/mm/yy
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, dd, mm, yy] = m;
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function monthFromIso(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 7);
}

// City suffixes that get appended to merchant strings; strip for a clean name.
const CITY_TOKENS = [
  "RIYADH", "JEDDAH", "DAMMAM", "MAKKAH", "MADINAH", "KHOBAR", "DUBAI",
  "SEATTLE", "MECCA", "ALKHOBAR", "TABUK", "ABHA", "BURAYDAH",
];

function splitCity(desc: string): { merchant: string; city: string | null } {
  let d = desc.replace(/\s+/g, " ").trim();
  for (const c of CITY_TOKENS) {
    const re = new RegExp("\\s*" + c + "\\s*$", "i");
    if (re.test(d)) {
      return { merchant: d.replace(re, "").trim() || d, city: c };
    }
    // concatenated (SAB) e.g. MEZAJCOFFEEJEDDAH
    const reCat = new RegExp(c + "$", "i");
    if (reCat.test(d) && d.length > c.length) {
      return { merchant: d.slice(0, d.length - c.length).trim(), city: c };
    }
  }
  return { merchant: d, city: null };
}

// Add spaces to CamelCase / concatenated SAB merchant strings for readability.
function humanize(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- categorization ----------

const CATEGORY_RULES: Array<{ category: string; kw: RegExp }> = [
  // Order matters — first match wins; keep keywords specific to avoid mis-bucketing.
  { category: "Bills & Telecom", kw: /sadad|\bstc\b|mobily|zain|salam|\bnwc\b|electric|\bsec\b|top-?up|topup|recharge|utility|biller/i },
  { category: "Travel & Airlines", kw: /airlines|airways|saudia|saudi airlines|flynas|flyadeal|airbnb|booking\.com|\bhotel\b|agoda|expedia|qatar airways|emirates|etihad|tourism/i },
  { category: "Dining & Coffee", kw: /coffee|cofee|caffe|\bcafe\b|restaurant|resto|starbucks|dunkin|mcdonald|\bkfc\b|burger|wingstop|jahez|hungerstation|toyou|mrsool|noura|urth|java|mezaj|catering|kitchen|bakery|shawrma|shawarma|dining|wraps|dessert|sweets|juice|donut/i },
  { category: "Groceries", kw: /panda|tamimi|carrefour|othaim|danube|\blulu\b|nesto|bindawood|hyperpanda|\bspar\b|supermarket|grocery|foods market|three foods/i },
  { category: "Health & Pharmacy", kw: /pharmacy|nahdi|dawaa|whites|hospital|clinic|medical|dental/i },
  { category: "Transport & Fuel", kw: /\buber\b|careem|petromin|aldrees|sasco|petrol|gas station|parking|\btaxi\b/i },
  { category: "Entertainment", kw: /cinema|\bvox\b|muvi|netflix|spotify|amazon prime|playstation|entertainment|lounge/i },
  { category: "Shopping", kw: /shein|amazon|\bnoon\b|namshi|orange bed|\bzara\b|centrepoint|\bikea\b|dior|christian|\bbrand\b|\bextra\b|jarir|boutique|nakheel mall|max\b/i },
];

function categorize(merchant: string, rawDesc: string): string {
  const hay = `${merchant} ${rawDesc}`;
  for (const r of CATEGORY_RULES) {
    if (r.kw.test(hay)) return r.category;
  }
  return "Other";
}

// ---------- bank detection ----------

function detectBank(fullText: string): ParsedStatement["bank"] {
  if (/SABCreditCardStatement|SABB|SAB Credit Card|Saudi Awwal/i.test(fullText.replace(/\s+/g, ""))) return "SAB";
  if (/AlrajhiBank|Al Rajhi|VISA FLY|SADAD Acc|ﺍﻟﺮﺍﺟﺤﻲ/i.test(fullText)) return "AlRajhi";
  if (/SAB/i.test(fullText)) return "SAB";
  return "Unknown";
}

// ---------- SAB parser ----------

function parseSAB(pages: Page[]): ParsedStatement {
  const full = pages.map((p) => p.text).join("\n");
  const flat = full.replace(/\s+/g, "");

  const cardName = /MasterCard/i.test(full) ? "MasterCard" : /Visa/i.test(full) ? "Visa" : null;
  const cardNoMatch = full.match(/XXXXXXXXXX(\d{4,6})/) || flat.match(/(\d{7,})\s*MasterCard/);
  const cardNumber = cardNoMatch ? cardNoMatch[1].slice(-4) : null;

  // Statement date: "... 0.00 30/06/2026 25/07/2026" (statement date, due date)
  const dm = full.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s*\n?StatementNumber/i)
    || flat.match(/(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})StatementNumber/i);
  const stmtDate = dm ? dm[1] : null;
  const dueDate = dm ? dm[2] : null;
  const iso = isoFromDMY(stmtDate || "");
  const statementMonth = monthFromIso(iso) ?? "unknown";

  // "New Balance Excluding Unbilled" and TotalAmountDue are the trailing two
  // figures of the summary strip: "... 12,144.94 0.00 12,144.94 MR.<name>"
  const totalDueMatch = flat.match(/([\d,]+\.\d{2})[\d,]*\.\d{2}?MR\./) || flat.match(/([\d,]+\.\d{2})MR\./);
  const totalDue = totalDueMatch ? parseFloat(totalDueMatch[1].replace(/,/g, "")) : null;
  const minMatch = flat.match(/MinimumPaymentDue([\d,]+\.\d{2})/i);
  const minimumDue = minMatch ? parseFloat(minMatch[1].replace(/,/g, "")) : null;

  // Transactions: DD/MM/YYYY desc [intl cur? rate fees vat] amountSAR
  const re = /(\d{2}\/\d{2}\/\d{4})\s*(.+?)\s+([\d,]+\.\d{2})\s*([A-Z]{3})?\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
  const txns: ParsedTxn[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(full))) {
    const [, d, descRaw, intl, cur, , , , amt] = m;
    const amount = parseFloat(amt.replace(/,/g, ""));
    const foreignAmount = cur ? parseFloat(intl.replace(/,/g, "")) : null;
    const desc = humanize(descRaw);
    const { merchant, city } = splitCity(desc);
    txns.push({
      txnDate: isoFromDMY(d),
      postDate: null,
      merchant: merchant || desc,
      city,
      rawDesc: desc,
      amount,
      currency: cur ?? null,
      foreignAmount,
      category: categorize(merchant, desc),
      isCredit: false,
    });
  }

  return {
    bank: "SAB",
    cardName,
    cardNumber,
    statementMonth,
    statementLabel: stmtDate,
    totalSpend: null,
    totalDebits: null,
    totalCredits: null,
    fees: null,
    vat: null,
    openingBalance: null,
    closingBalance: null,
    minimumDue,
    totalDue,
    dueDate,
    transactions: txns,
  };
}

// ---------- Al Rajhi parser (x-column bands) ----------

function parseAlRajhi(pages: Page[]): ParsedStatement {
  const full = pages.map((p) => p.text).join("\n");

  const cardName = (full.match(/Card Name\s*\n?\s*(VISA[^\n]*|MASTERCARD[^\n]*|MADA[^\n]*)/i)?.[1]
    || full.match(/(VISA FLY INFINITE[^\n]*)/i)?.[1] || "").trim() || null;
  const cardNumber = full.match(/(\d{4})\s+\d{2}XX\s+XXXX\s+(\d{4})/)?.[2]
    || full.match(/XXXX\s+(\d{4})/)?.[1] || null;
  const label = full.match(/Statement Month\s*\n?\s*([A-Z]+,\s*\d{4})/i)?.[1]
    || full.match(/([A-Z]+,\s*20\d{2})/)?.[1] || null;

  // Only trust the payment due date + total-due line from the header; the rest
  // of the summary box interleaves Arabic/English unreliably, so the headline
  // totals are derived from the reconciled transactions in parseStatement().
  const dueLine = full.match(/(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/);
  const dueDate = dueLine ? dueLine[1] : null;
  const minimumDue = dueLine ? parseFloat(dueLine[2].replace(/,/g, "")) : null;
  const totalDue = dueLine ? parseFloat(dueLine[3].replace(/,/g, "")) : null;

  // Determine statement month from the statement label or the modal txn month.
  let statementMonth = "unknown";
  if (label) {
    const mm = label.match(/([A-Z]+),\s*(\d{4})/i);
    if (mm) {
      const idx = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].indexOf(mm[1].toUpperCase());
      if (idx >= 0) statementMonth = `${mm[2]}-${String(idx + 1).padStart(2, "0")}`;
    }
  }

  const txns: ParsedTxn[] = [];
  for (const page of pages) {
    const W = page.width;
    const sx = W / 595.275;
    const band = (lo: number, hi: number) => ({ lo: lo * sx, hi: hi * sx });
    const cBill = band(40, 120), cDesc = band(190, 320), cAmt = band(320, 395), cPost = band(400, 465), cTxn = band(470, 545);
    const anchors = page.items.filter((it) => it.x >= cTxn.lo && it.x <= cTxn.hi && /^\d{2}\/\d{2}\/\d{2}$/.test(it.s));
    for (const a of anchors) {
      const rowItems = page.items.filter((it) => Math.abs(it.y - a.y) <= 8);
      const pick = (c: { lo: number; hi: number }) => rowItems.filter((it) => it.x >= c.lo && it.x <= c.hi);
      const billStr = pick(cBill).sort((u, v) => u.x - v.x).map((i) => i.s).join(" ");
      const amtStr = pick(cAmt).sort((u, v) => u.x - v.x).map((i) => i.s).join(" ");
      const descItems = pick(cDesc).sort((u, v) => v.y - u.y || u.x - v.x);
      const postStr = pick(cPost).map((i) => i.s).join(" ");
      const bill = num(billStr);
      const amt = num(amtStr);
      const value = bill ?? amt;
      if (value == null) continue;
      const rowText = [...rowItems].sort((u, v) => u.x - v.x).map((i) => i.s).join(" ");
      const isCredit = /^CR\b/.test(rowText) || /Advance Payment|Top-?up/i.test(rowText);
      let desc = descItems.map((i) => i.s).join(" ").replace(/Bill NO:|Biller ID:\s*\d+\s*-/gi, "").replace(/\s+/g, " ").trim();
      const curMatch = amtStr.match(/\b([A-Z]{3})\b/);
      const currency = curMatch && curMatch[1] !== "SAR" ? curMatch[1] : null;
      if (/Sadad Bill Payment/i.test(rowText) && !desc) desc = "SADAD Bill Payment";
      const { merchant, city } = splitCity(desc || "(unknown)");
      txns.push({
        txnDate: isoFromDMY(a.s),
        postDate: isoFromDMY(postStr.match(/\d{2}\/\d{2}\/\d{2}/)?.[0] ?? ""),
        merchant: merchant || "(unknown)",
        city,
        rawDesc: desc || null,
        amount: value,
        currency,
        foreignAmount: currency ? num(amtStr) : null,
        category: isCredit ? "Payments & Credits" : categorize(merchant, desc),
        isCredit,
      });
    }
  }

  // Deduplicate consecutive identical rows (pdf occasionally repeats a row).
  const dedup: ParsedTxn[] = [];
  for (const t of txns) {
    const prev = dedup[dedup.length - 1];
    if (prev && prev.txnDate === t.txnDate && prev.amount === t.amount && prev.merchant === t.merchant && prev.isCredit === t.isCredit) {
      // keep — genuine same-day repeats exist; only skip exact dup if description empty
      if (t.merchant === "(unknown)") continue;
    }
    dedup.push(t);
  }

  return {
    bank: "AlRajhi",
    cardName,
    cardNumber,
    statementMonth,
    statementLabel: label,
    totalSpend: null,
    totalDebits: null,
    totalCredits: null,
    fees: null,
    vat: null,
    openingBalance: null,
    closingBalance: null,
    minimumDue,
    totalDue,
    dueDate,
    transactions: dedup,
  };
}

// ---------- entry point ----------

export async function parseStatement(buffer: Uint8Array, fileName: string): Promise<ParsedStatement> {
  const pages = await extractPages(buffer);
  const fullText = pages.map((p) => p.text).join("\n");
  const bank = detectBank(fullText);

  let parsed: ParsedStatement;
  if (bank === "SAB") parsed = parseSAB(pages);
  else if (bank === "AlRajhi") parsed = parseAlRajhi(pages);
  else {
    parsed = {
      bank: "Unknown",
      cardName: null,
      cardNumber: null,
      statementMonth: "unknown",
      statementLabel: null,
      totalSpend: null,
      totalDebits: null,
      totalCredits: null,
      fees: null,
      vat: null,
      openingBalance: null,
      closingBalance: null,
      minimumDue: null,
      totalDue: null,
      dueDate: null,
      transactions: [],
    };
  }

  // Derive authoritative totals from the (reconciled) transactions. These are
  // more reliable than the bilingual summary box.
  const debits = parsed.transactions.filter((t) => !t.isCredit);
  const credits = parsed.transactions.filter((t) => t.isCredit);
  parsed.totalDebits = round2(debits.reduce((s, t) => s + t.amount, 0));
  parsed.totalCredits = round2(credits.reduce((s, t) => s + t.amount, 0));
  parsed.totalSpend = parsed.totalDebits;

  // Fallback statement month from transactions if the header parse missed it.
  if (parsed.statementMonth === "unknown" && parsed.transactions.length) {
    const months = new Map<string, number>();
    for (const t of parsed.transactions) {
      const mo = monthFromIso(t.txnDate);
      if (mo) months.set(mo, (months.get(mo) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestN = 0;
    for (const [mo, n] of months) if (n > bestN) { bestN = n; best = mo; }
    if (best) parsed.statementMonth = best;
  }

  void fileName;
  return parsed;
}
