#!/usr/bin/env node
// ETL: copy all data from the Neon Postgres database into Cloudflare D1.
//
// Reads each table from Neon over the HTTP driver (raw :5432 is blocked in
// some sandboxes), formats every value the way Prisma's SQLite connector
// expects (DateTime -> ISO text, Boolean -> 0/1, BigInt -> integer, Json ->
// text), writes chunked .sql files under scripts/etl-out/, and applies them to
// D1 with `wrangler d1 execute`.
//
// Usage:
//   NEON_URL="postgres://..." node scripts/etl-neon-to-d1.mjs [--generate-only] [--chunk 5000] [--db tadawul]
//
// Requires (for the apply step): CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
// in the environment. Tables are loaded parent-first so foreign keys resolve.

import { neon } from "@neondatabase/serverless";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const NEON_URL = process.env.NEON_URL || process.env.DATABASE_URL;
if (!NEON_URL) {
  console.error("Set NEON_URL (or DATABASE_URL) to the Neon connection string.");
  process.exit(1);
}
const args = process.argv.slice(2);
const generateOnly = args.includes("--generate-only");
const CHUNK = Number(args[args.indexOf("--chunk") + 1]) || 10000;
const DB_NAME = args[args.indexOf("--db") + 1] || "tadawul";
const OUT = path.join("scripts", "etl-out");

const sql = neon(NEON_URL);

// Parent-first order so FK references exist when children are inserted.
const TABLES = [
  "ScrapeSession",
  "StockRecord",
  "CompanyProfile",
  "Announcement",
  "Dividend",
  "BoardMember",
  "CorporateAction",
  "FinancialStatement",
  "HistoricalPrice",
  "InvestmentUpload",
  "InvestmentCash",
  "InvestmentSaudiStock",
  "InvestmentSaudiFund",
  "InvestmentUsaStock",
  "InvestmentGulfStock",
  "InvestmentTransaction",
  "DividendUpload",
  "DividendPayment",
  "DividendSymbolMap",
  "ExpenseStatement",
  "ExpenseTransaction",
];

function esc(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

// Format one value for SQLite, given its Postgres column type.
function fmt(value, pgType) {
  if (value === null || value === undefined) return "NULL";
  switch (pgType) {
    case "timestamp without time zone":
    case "timestamp with time zone":
    case "timestamptz":
    case "timestamp": {
      // Match Prisma's stored form: ISO with .SSS and +00:00 offset.
      const d = value instanceof Date ? value : new Date(value);
      return esc(d.toISOString().replace(/Z$/, "+00:00"));
    }
    case "boolean":
      return value ? "1" : "0";
    case "bigint":
    case "integer":
    case "smallint":
      return String(typeof value === "bigint" ? value : Math.trunc(Number(value)));
    case "double precision":
    case "real":
    case "numeric":
      return String(Number(value));
    case "json":
    case "jsonb":
      // D1 schema stores these as TEXT (JSON string).
      return esc(typeof value === "string" ? value : JSON.stringify(value));
    default:
      return esc(value);
  }
}

async function columns(table) {
  const rows = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((r) => ({ name: r.column_name, type: r.data_type }));
}

async function count(table) {
  const r = await sql.query(`SELECT count(*)::int AS n FROM "${table}"`);
  return r[0].n;
}

async function run() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const applyCmds = [];
  let grandTotal = 0;

  for (const table of TABLES) {
    const cols = await columns(table);
    if (cols.length === 0) {
      console.log(`- ${table}: not found, skipping`);
      continue;
    }
    const total = await count(table);
    grandTotal += total;
    if (total === 0) {
      console.log(`- ${table}: 0 rows`);
      continue;
    }
    const colList = cols.map((c) => `"${c.name}"`).join(",");
    const insertPrefix = `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES `;
    // Statements are byte-bounded (flush before ~50 KB) so wide-JSON tables
    // (FinancialStatement, CompanyProfile) stay under D1's statement-size cap,
    // while narrow tables still pack many rows per statement. INSERT OR IGNORE
    // makes re-runs idempotent. Keyset pagination on the `id` PK avoids slow
    // OFFSET scans on the large tables.
    const MAX_STMT_BYTES = 50000;
    let lastId = "";
    let fileIdx = 0;
    let done = 0;
    for (;;) {
      const rows = await sql.query(
        `SELECT * FROM "${table}" WHERE "id" > $1 ORDER BY "id" LIMIT ${CHUNK}`,
        [lastId]
      );
      if (rows.length === 0) break;
      const parts = ["PRAGMA defer_foreign_keys=TRUE;"];
      let buf = [];
      let bufLen = insertPrefix.length;
      const flush = () => {
        if (buf.length) {
          parts.push(insertPrefix + buf.join(",") + ";");
          buf = [];
          bufLen = insertPrefix.length;
        }
      };
      for (const row of rows) {
        const tuple = "(" + cols.map((c) => fmt(row[c.name], c.type)).join(",") + ")";
        if (buf.length && bufLen + tuple.length + 1 > MAX_STMT_BYTES) flush();
        buf.push(tuple);
        bufLen += tuple.length + 1;
      }
      flush();
      const file = path.join(OUT, `${String(TABLES.indexOf(table)).padStart(2, "0")}_${table}_${String(fileIdx).padStart(4, "0")}.sql`);
      fs.writeFileSync(file, parts.join("\n") + "\n");
      applyCmds.push(
        `npx wrangler d1 execute ${DB_NAME} --remote --file="${file}" --yes`
      );
      lastId = rows[rows.length - 1].id;
      done += rows.length;
      fileIdx++;
      process.stdout.write(`\r  ${table}: ${done}/${total}   `);
      if (rows.length < CHUNK) break;
    }
    console.log("");
  }

  const applyScript = path.join(OUT, "apply-all.sh");
  fs.writeFileSync(applyScript, "#!/bin/sh\nset -e\n" + applyCmds.join("\n") + "\n");
  fs.chmodSync(applyScript, 0o755);
  console.log(`\nGenerated ${applyCmds.length} chunk file(s) for ${grandTotal.toLocaleString()} rows in ${OUT}/`);

  if (generateOnly) {
    console.log(`Generate-only. Apply with: sh ${applyScript}`);
    return;
  }
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.log("CLOUDFLARE_API_TOKEN/ACCOUNT_ID not set — skipping apply. Run:", applyScript);
    return;
  }
  console.log("Applying to D1...");
  for (const cmd of applyCmds) {
    execSync(cmd, { stdio: "inherit" });
  }
  console.log("ETL complete.");
}

run().catch((e) => {
  console.error("\nETL failed:", e.message);
  process.exit(1);
});
