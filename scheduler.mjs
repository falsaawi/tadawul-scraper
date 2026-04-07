/**
 * Local scheduler - runs alongside `npm run dev` to scrape every 5 minutes
 * during Tadawul trading hours (Sun-Thu, 10:00 AM - 3:00 PM Riyadh time).
 *
 * Usage: node scheduler.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function getRiyadhTime() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
}

function isTradingHours() {
  const riyadh = getRiyadhTime();
  const day = riyadh.getDay();
  if (day < 0 || day > 4) return false; // Fri-Sat = weekend
  const minutes = riyadh.getHours() * 60 + riyadh.getMinutes();
  return minutes >= 600 && minutes <= 905; // 10:00 AM to 3:05 PM
}

function formatTime() {
  return getRiyadhTime().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

async function scrape() {
  if (!isTradingHours()) {
    console.log(`[${formatTime()}] Outside trading hours, skipping`);
    return;
  }

  try {
    console.log(`[${formatTime()}] Triggering scrape...`);
    const res = await fetch(`${BASE_URL}/api/scrape`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      console.log(`[${formatTime()}] ✓ Scraped ${data.rowCount} stocks`);
    } else {
      console.log(`[${formatTime()}] ✗ Failed: ${data.error}`);
    }
  } catch (err) {
    console.log(`[${formatTime()}] ✗ Error: ${err.message}`);
  }
}

console.log("=== Tadawul Local Scheduler ===");
console.log(`Server: ${BASE_URL}`);
console.log(`Interval: every 5 minutes during trading hours`);
console.log(`Trading hours: Sun-Thu, 10:00 AM - 3:00 PM (Riyadh)`);
console.log(`Current Riyadh time: ${formatTime()}`);
console.log(`Trading now: ${isTradingHours() ? "YES" : "NO"}`);
console.log("===============================\n");

// Run immediately
scrape();

// Then every 5 minutes
setInterval(scrape, INTERVAL_MS);
