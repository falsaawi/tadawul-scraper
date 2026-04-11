"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { MarketOverview } from "@/components/analytics/market-overview";
import { Filter, TrendingUp, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import type { AnalyticsSummaryResponse } from "@/types/analytics";

const SECTORS = [
  "Energy", "Materials", "Capital Goods", "Banks", "Financial Services",
  "Insurance", "Telecommunication Services", "Utilities", "REITs", "Real Estate Mgmt & Dev't",
];

interface SectorTimeSeries {
  scrapedAt: string;
  avgPrice: number | null;
  totalVolume: number | null;
  avgChange: number | null;
  stockCount: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtK(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function AnalyticsPage() {
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" })
  );
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [sectorData, setSectorData] = useState<SectorTimeSeries[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics?date=${selectedDate}`);
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedDate]);

  const fetchSectorData = useCallback(async () => {
    if (!selectedSector) { setSectorData([]); return; }
    try {
      const res = await fetch(`/api/analytics?sector=${encodeURIComponent(selectedSector)}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSectorData(data.timeSeries || []);
      }
    } catch { /* ignore */ }
  }, [selectedSector, selectedDate]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchSectorData(); }, [fetchSectorData]);

  const chartData = sectorData.map((d) => ({
    time: formatTime(d.scrapedAt),
    avgPrice: d.avgPrice,
    totalVolume: d.totalVolume,
    avgChange: d.avgChange,
  }));

  const prices = chartData.map((d) => d.avgPrice).filter((p): p is number => p != null);
  const minP = prices.length > 0 ? Math.min(...prices) * 0.998 : 0;
  const maxP = prices.length > 0 ? Math.max(...prices) * 1.002 : 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Market Analytics</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            TASI market and sector performance analysis
          </p>
        </div>

        {/* Sector Filter */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              <Filter className="inline h-3 w-3 mr-1" />Sector
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="">TASI - All Market</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Sector/TASI Charts — only show when sector is selected and has data */}
        {selectedSector && chartData.length > 0 && (
          <>
            {/* Avg Price Chart */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{selectedSector} — Avg Price Movement</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="sectorPriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 16%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" />
                  <YAxis domain={[minP, maxP]} tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" tickFormatter={(v) => v.toFixed(2)} />
                  <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: "8px", color: "hsl(210 40% 92%)", fontSize: 12 }}
                    formatter={(value) => [Number(value).toFixed(2), "Avg Price (SAR)"]} />
                  <Area type="monotone" dataKey="avgPrice" stroke="#22c55e" fill="url(#sectorPriceGrad)" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-foreground">{selectedSector} — Total Volume</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 16%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" tickFormatter={fmtK} />
                  <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: "8px", color: "hsl(210 40% 92%)", fontSize: 12 }}
                    formatter={(value) => [fmtK(Number(value)), "Total Volume"]} />
                  <Bar dataKey="totalVolume" fill="#3b82f6" opacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {selectedSector && chartData.length === 0 && !loading && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            No intraday data for {selectedSector} on {selectedDate}. Charts require scrape data from a trading day.
          </div>
        )}

        {/* Market Movers — always shown */}
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
            />
          </div>
        )}

        {!summary && !loading && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            No data available. Go to Dashboard and trigger a scrape first.
          </div>
        )}
      </main>
    </div>
  );
}
