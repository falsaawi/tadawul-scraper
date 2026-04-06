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
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Saudi Stock Exchange (Tadawul) market data scraper
          </p>
        </div>

        <SummaryCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ScrapeTrigger onComplete={handleScrapeComplete} />
          </div>
          <ExportButtons />
        </div>

        <MarketTable refreshKey={refreshKey} />

        <ScrapeStatus refreshKey={refreshKey} />
      </main>
    </div>
  );
}
