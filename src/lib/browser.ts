import type { Browser } from "puppeteer-core";

// chromium-min downloads the browser binary from this CDN at runtime
// Must match the installed @sparticuz/chromium-min version
const CHROMIUM_CDN =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.x64.tar";

export async function getBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import("@sparticuz/chromium-min");
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.default.executablePath(CHROMIUM_CDN),
      headless: true,
    });
  }

  // Local development
  const localPath = process.env.CHROME_EXECUTABLE_PATH;
  if (localPath) {
    return puppeteer.default.launch({
      executablePath: localPath,
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  // Fallback: use full puppeteer (dev dependency)
  try {
    const fullPuppeteer = await import("puppeteer");
    return fullPuppeteer.default.launch({
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    throw new Error(
      "No Chrome executable found. Set CHROME_EXECUTABLE_PATH or install puppeteer as dev dependency."
    );
  }
}
