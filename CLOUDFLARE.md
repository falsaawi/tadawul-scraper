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
