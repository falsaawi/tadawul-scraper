This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## WHOOP integration

Pull your own [WHOOP](https://www.whoop.com) recovery, sleep, strain and workout
data into the app via the WHOOP v2 API.

### Setup

1. Create an app in the [WHOOP Developer Dashboard](https://developer.whoop.com/dashboard).
2. Add `<your-app-origin>/api/whoop/callback` as a **Redirect URL** (e.g.
   `http://localhost:3000/api/whoop/callback` for local dev and your production
   URL for Vercel).
3. Copy the Client ID / Secret into your environment:

   ```bash
   WHOOP_CLIENT_ID="..."
   WHOOP_CLIENT_SECRET="..."
   # Optional — pin the redirect URI (must match the dashboard exactly):
   WHOOP_REDIRECT_URI="https://your-app.vercel.app/api/whoop/callback"
   ```

4. Run `npm run db:push` (or deploy — `build` runs it) to create the WHOOP tables.
5. Open **/whoop**, click **Connect WHOOP**, authorize, then **Sync now**.

OAuth uses the authorization-code flow with the `offline` scope, so a refresh
token is stored and tokens are refreshed automatically. A Vercel cron job
(`/api/cron/whoop`, every 6 hours, protected by `CRON_SECRET`) keeps the data
fresh; each sync is incremental and idempotent.

### Endpoints

| Route | Purpose |
| --- | --- |
| `GET /api/whoop/connect` | Start the OAuth flow |
| `GET /api/whoop/callback` | OAuth redirect target (token exchange) |
| `GET /api/whoop/status` | Connection + last-sync status |
| `POST /api/whoop/sync` | Manual incremental sync |
| `GET /api/whoop/data?days=30` | Stored data for the dashboard |
| `POST /api/whoop/disconnect` | Remove stored tokens |
| `GET /api/cron/whoop` | Scheduled sync (Bearer `CRON_SECRET`) |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
