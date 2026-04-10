"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line,
} from "recharts";
import { TrendingUp, BarChart3, Calendar } from "lucide-react";

interface PricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  trades: number | null;
}

const RANGES = [
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "3Y", label: "3Y", days: 1095 },
  { key: "5Y", label: "5Y", days: 1825 },
  { key: "ALL", label: "All", days: 0 },
];

function fmtK(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

export function PriceHistoryChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [range, setRange] = useState("1Y");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let fromDate = "";
      if (range !== "ALL") {
        const r = RANGES.find((r) => r.key === range);
        if (r && r.days > 0) {
          const d = new Date();
          d.setDate(d.getDate() - r.days);
          fromDate = d.toISOString().split("T")[0];
        }
      }
      const params = new URLSearchParams({ symbol });
      if (fromDate) params.set("from", fromDate);

      const res = await fetch(`/api/company/history?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.prices || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [symbol, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground animate-pulse">
        Loading price history...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
        No historical price data available for {symbol}. Run the historical scraper first.
      </div>
    );
  }

  // Thin data for display (max 500 points for performance)
  const step = data.length > 500 ? Math.ceil(data.length / 500) : 1;
  const chartData = data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d) => ({
    date: d.date,
    close: d.close,
    volume: d.volume,
    high: d.high,
    low: d.low,
  }));

  const prices = chartData.map((d) => d.close).filter((p): p is number => p != null);
  const minP = prices.length > 0 ? Math.min(...prices) * 0.97 : 0;
  const maxP = prices.length > 0 ? Math.max(...prices) * 1.03 : 100;

  const firstPrice = data[0]?.close;
  const lastPrice = data[data.length - 1]?.close;
  const totalChange = firstPrice && lastPrice ? lastPrice - firstPrice : 0;
  const totalChangePct = firstPrice ? (totalChange / firstPrice) * 100 : 0;
  const isPositive = totalChange >= 0;

  return (
    <div className="space-y-4">
      {/* Price Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Historical Price</h3>
            <span className="text-xs text-muted-foreground">({data.length} days)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{totalChange.toFixed(2)} ({isPositive ? "+" : ""}{totalChangePct.toFixed(1)}%)
            </span>
            <div className="flex gap-0.5 bg-accent rounded-lg p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    range === r.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="histPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" interval="preserveStartEnd" tickFormatter={(v) => v.substring(0, 7)} />
            <YAxis domain={[minP, maxP]} tick={{ fontSize: 9, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: "8px", color: "hsl(210 40% 92%)", fontSize: 11 }}
              formatter={(value) => [Number(value).toFixed(2), "Close (SAR)"]} />
            <Area type="monotone" dataKey="close" stroke={isPositive ? "#22c55e" : "#ef4444"} fill="url(#histPriceGrad)" strokeWidth={1.5} dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">Historical Volume</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" interval="preserveStartEnd" tickFormatter={(v) => v.substring(0, 7)} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" tickFormatter={fmtK} />
            <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: "8px", color: "hsl(210 40% 92%)", fontSize: 11 }}
              formatter={(value) => [fmtK(Number(value)), "Volume"]} />
            <Bar dataKey="volume" fill="#3b82f6" opacity={0.6} radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
