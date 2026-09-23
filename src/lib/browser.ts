import puppeteer, { type Browser, type BrowserWorker } from "@cloudflare/puppeteer";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Launches a browser through Cloudflare Browser Rendering (the `BROWSER`
// binding declared in wrangler.jsonc). Replaces the old
// puppeteer-core + @sparticuz/chromium setup, which cannot run on Workers.
export async function getBrowser(): Promise<Browser> {
  const { env } = getCloudflareContext();
  const binding = (env as unknown as { BROWSER?: BrowserWorker }).BROWSER;
  if (!binding) {
    throw new Error(
      "Cloudflare Browser Rendering binding 'BROWSER' is not configured."
    );
  }
  return puppeteer.launch(binding);
}
