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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics?date=${selectedDate}`);
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
  }, [selectedDate]);

  const fetchStock = useCallback(async () => {
    if (!selectedSymbol) { setStockData(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?symbol=${selectedSymbol}&date=${selectedDate}`);
      if (res.ok) setStockData(await res.json());
      else setStockData(null);
    } catch { setStockData(null); }
    finally { setLoading(false); }
  }, [selectedSymbol, selectedDate]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchStock(); }, [fetchStock]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Performance analysis and financial insights
          </p>
        </div>

        <StockSelector
          stocks={summary?.stockList || []}
          selectedSymbol={selectedSymbol}
          selectedDate={selectedDate}
          onSymbolChange={setSelectedSymbol}
          onDateChange={setSelectedDate}
          snapshot={stockData?.snapshot}
        />

        {!selectedSymbol && summary && (
          <MarketOverview
            topGainers={summary.topGainers}
            topLosers={summary.topLosers}
            mostActiveByVolume={summary.mostActiveByVolume || []}
            mostActiveByTrades={summary.mostActiveByTrades || []}
            biggestSwings={summary.biggestSwings || []}
            near52High={summary.near52High || []}
            near52Low={summary.near52Low || []}
            widestSpreads={summary.widestSpreads || []}
            tightestSpreads={summary.tightestSpreads || []}
            marketStats={summary.marketStats}
            onSelectStock={setSelectedSymbol}
          />
        )}

        {selectedSymbol && loading && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground animate-pulse">
            Loading analysis...
          </div>
        )}

        {selectedSymbol && !loading && !stockData && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            No data for {selectedSymbol} on {selectedDate}.
          </div>
        )}

        {selectedSymbol && stockData && !loading && (
          <>
            <div className="grid grid-cols-1 gap-5">
              <PriceChart data={stockData.timeSeries} snapshot={stockData.snapshot} />
              <VolumeChart data={stockData.timeSeries} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Financial Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <IntradayCard snapshot={stockData.snapshot} />
                <BidAskCard data={stockData.timeSeries} analysis={stockData.analysis} snapshot={stockData.snapshot} />
                <VwapCard analysis={stockData.analysis} snapshot={stockData.snapshot} />
                <VolatilityCard analysis={stockData.analysis} snapshot={stockData.snapshot} />
                <Week52Card analysis={stockData.analysis} snapshot={stockData.snapshot} />
              </div>
            </div>

            {summary && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Market Movers</h2>
                <MarketOverview
                  topGainers={summary.topGainers}
                  topLosers={summary.topLosers}
                  mostActiveByVolume={summary.mostActiveByVolume || []}
                  mostActiveByTrades={summary.mostActiveByTrades || []}
                  biggestSwings={summary.biggestSwings || []}
                  near52High={summary.near52High || []}
                  near52Low={summary.near52Low || []}
                  widestSpreads={summary.widestSpreads || []}
                  tightestSpreads={summary.tightestSpreads || []}
                  marketStats={summary.marketStats}
                  onSelectStock={setSelectedSymbol}
                />
              </div>
            )}
          </>
        )}

        {!selectedSymbol && !summary && !loading && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            No data available. Go to Dashboard and trigger a scrape first.
          </div>
        )}
      </main>
    </div>
  );
}
