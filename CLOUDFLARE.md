# Cloudflare migration runbook

Status: hosting (OpenNext), D1 schema, scraper→Browser Rendering and the
Neon→D1 ETL tooling are all done on the `claude/cloudflare-migration` branch.
The remaining steps need Cloudflare credentials in the environment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit, D1:Edit, Workers R2:Edit,
  Account Settings:Read, Browser Rendering:Edit)

## Phase 5a — create D1 and apply the schema

```sh
npx wrangler d1 create tadawul
# copy the returned database_id into wrangler.jsonc (d1_databases[0].database_id)
npx wrangler d1 migrations apply tadawul --remote     # creates the 21 tables
```

## Phase 3 — ETL: copy all data Neon → D1

```sh
NEON_URL="postgres://…neon…/neondb?sslmode=require" \
  node scripts/etl-neon-to-d1.mjs            # generates + applies chunk files
# or, to inspect first:
NEON_URL="…" node scripts/etl-neon-to-d1.mjs --generate-only
sh scripts/etl-out/apply-all.sh
```

Values are formatted to match Prisma's SQLite encoding (DateTime→ISO text,
Boolean→0/1, BigInt→integer, Json→text); verified with a round-trip test.

## Phase 5b — secrets and deploy

```sh
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put AUTH_SECRET
npx wrangler secret put CRON_SECRET
npm run cf:deploy                            # opennextjs-cloudflare build && deploy
```

## Verify

- Open the workers.dev URL → redirected to `/login`; sign in.
- Dashboard, My Investment, My Dividend, My Expenses load with data.
- `npx wrangler tail` and watch a cron fire during Riyadh trading hours, or
  trigger the scrape route manually with the CRON_SECRET bearer.

## Notes

- The app now runs on D1 only (Prisma provider = sqlite). The Vercel/Neon
  deployment stays live and untouched until you cut over DNS.
- `worker.ts` adds the cron `scheduled()` handler (Cloudflare Cron Triggers
  in wrangler.jsonc) — replaces the Vercel crons.

## Gotchas discovered during the migration

- **Prisma is pinned to 6.19.x — do not upgrade to 7.x.** Prisma 7's rust-free
  client compiles its query-compiler WASM from bytes at runtime
  (`new WebAssembly.Module(bytes)`), which Cloudflare Workers forbids
  ("Wasm code generation disallowed by embedder", prisma/prisma#28657). The
  6.19 `prisma-client-js` client loads the query-engine WASM as a static module
  import (`import('./query_engine_bg.wasm')`), which workerd allows.
- **Keep `@prisma/client` / `.prisma/client` in `serverExternalPackages`**
  (next.config.ts). Otherwise Next's turbopack build inlines the engine WASM as
  base64 and re-introduces the runtime-compile path. Left external, the `.wasm`
  import survives to OpenNext/wrangler, which bundle it as a CompiledWasm module.
- **Cloudflare cron day-of-week is nonstandard: 1 = Sunday .. 7 = Saturday.**
  Riyadh's Sun–Thu week is `SUN-THU` (or `1-5`), NOT `0-4` — `0` is rejected
  with "invalid cron string" [code 10100].
- Raw SQL must be SQLite, not Postgres. `SELECT DISTINCT ON (...)` is not
  supported; use a `ROW_NUMBER() OVER (PARTITION BY ...)` subquery instead
  (see src/app/api/recommendations/route.ts).
