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
    <div className="flex items-center gap-3">
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
      {result && (
        <span
          className={`text-xs font-medium ${
            result.success ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.success ? `${result.rowCount} stocks scraped` : result.error}
        </span>
      )}
    </div>
  );
}
