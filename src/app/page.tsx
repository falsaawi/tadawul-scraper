"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ScrapeTrigger } from "@/components/dashboard/scrape-trigger";
import { MarketTable } from "@/components/dashboard/market-table";
import { ScrapeStatus } from "@/components/dashboard/scrape-status";
import { ExportButtons } from "@/components/dashboard/export-buttons";

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScrapeComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Title + Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Saudi Stock Exchange (Tadawul) market data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ScrapeTrigger onComplete={handleScrapeComplete} />
            <div className="w-px h-6 bg-border" />
            <ExportButtons />
          </div>
        </div>

        <SummaryCards />

        <MarketTable refreshKey={refreshKey} />

        <ScrapeStatus refreshKey={refreshKey} />
      </main>
    </div>
  );
}
