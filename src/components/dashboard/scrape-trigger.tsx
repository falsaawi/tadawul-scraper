"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

interface ScrapeResult {
  success?: boolean;
  error?: string;
  rowCount?: number;
}

export function ScrapeTrigger({ onComplete }: { onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function handleScrape() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      setResult(data);
      if (onComplete) onComplete();
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Failed to trigger scrape" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Manual Scrape</h3>
        <button
          onClick={handleScrape}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Scrape Now
            </>
          )}
        </button>
      </div>
      {result && (
        <div
          className={`text-sm p-3 rounded-lg ${
            result.success
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {result.success
            ? `Successfully scraped ${result.rowCount} stocks`
            : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
}
