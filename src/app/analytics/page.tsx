"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { StockSelector } from "@/components/analytics/stock-selector";
import { PriceChart } from "@/components/analytics/price-chart";
import { VolumeChart } from "@/components/analytics/volume-chart";
import { MarketOverview } from "@/components/analytics/market-overview";
import { IntradayCard } from "@/components/analytics/intraday-card";
import { BidAskCard } from "@/components/analytics/bid-ask-card";
import { VwapCard } from "@/components/analytics/vwap-card";
import { VolatilityCard } from "@/components/analytics/volatility-card";
import { Week52Card } from "@/components/analytics/week52-card";
import type {
  AnalyticsSummaryResponse,
  AnalyticsTimeSeriesResponse,
} from "@/types/analytics";

export default function AnalyticsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" })
  );
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [stockData, setStockData] = useState<AnalyticsTimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch market summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // ignore
    }
  }, [selectedDate]);

  // Fetch stock time-series
  const fetchStock = useCallback(async () => {
    if (!selectedSymbol) {
      setStockData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics?symbol=${selectedSymbol}&date=${selectedDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
      } else {
        setStockData(null);
      }
    } catch {
      setStockData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Stock Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Performance analysis and financial insights from scraped data
          </p>
        </div>

        {/* Stock Selector */}
        <StockSelector
          stocks={summary?.stockList || []}
          selectedSymbol={selectedSymbol}
          selectedDate={selectedDate}
          onSymbolChange={handleSelectStock}
          onDateChange={setSelectedDate}
          snapshot={stockData?.snapshot}
        />

        {/* Market Overview (when no stock selected) */}
        {!selectedSymbol && summary && (
          <MarketOverview
            topGainers={summary.topGainers}
            topLosers={summary.topLosers}
            mostActive={summary.mostActive}
            marketStats={summary.marketStats}
            onSelectStock={handleSelectStock}
          />
        )}

        {/* Stock Analysis (when stock selected) */}
        {selectedSymbol && loading && (
          <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground animate-pulse">
            Loading analysis...
          </div>
        )}

        {selectedSymbol && !loading && !stockData && (
          <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground">
            No data found for {selectedSymbol} on {selectedDate}. Try a different date.
          </div>
        )}

        {selectedSymbol && stockData && !loading && (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 gap-6">
              <PriceChart data={stockData.timeSeries} snapshot={stockData.snapshot} />
              <VolumeChart data={stockData.timeSeries} />
            </div>

            {/* Analysis Cards */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Financial Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <IntradayCard snapshot={stockData.snapshot} />
                <BidAskCard
                  data={stockData.timeSeries}
                  analysis={stockData.analysis}
                  snapshot={stockData.snapshot}
                />
                <VwapCard analysis={stockData.analysis} snapshot={stockData.snapshot} />
                <VolatilityCard analysis={stockData.analysis} snapshot={stockData.snapshot} />
                <Week52Card analysis={stockData.analysis} snapshot={stockData.snapshot} />
              </div>
            </div>

            {/* Market movers always visible below stock analysis */}
            {summary && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Market Movers</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MarketOverview
                    topGainers={summary.topGainers}
                    topLosers={summary.topLosers}
                    mostActive={summary.mostActive}
                    marketStats={summary.marketStats}
                    onSelectStock={handleSelectStock}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!selectedSymbol && !summary && !loading && (
          <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground">
            No data available. Go to the Dashboard and trigger a scrape first.
          </div>
        )}
      </main>
    </div>
  );
}
