"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";
import type { TimeSeriesPoint, StockSnapshot } from "@/types/analytics";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function PriceChart({ data, snapshot }: { data: TimeSeriesPoint[]; snapshot: StockSnapshot }) {
  const chartData = data.map((d) => ({ time: formatTime(d.scrapedAt), price: d.lastTradePrice }));
  const prices = data.map((d) => d.lastTradePrice).filter((p): p is number => p != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) * 0.998 : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) * 1.002 : 100;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Price Movement</h3>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 16%)" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" />
          <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} tickFormatter={(v) => v.toFixed(2)} stroke="hsl(215 20% 16%)" />
          <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: "8px", color: "hsl(210 40% 92%)", fontSize: 12 }}
            formatter={(value) => [Number(value).toFixed(2), "Price (SAR)"]} labelStyle={{ fontWeight: 600, color: "hsl(210 40% 92%)" }} />
          {snapshot.todayOpen != null && <ReferenceLine y={snapshot.todayOpen} stroke="#818cf8" strokeDasharray="5 5" label={{ value: `Open ${snapshot.todayOpen}`, position: "right", fontSize: 9, fill: "#818cf8" }} />}
          {snapshot.todayHigh != null && <ReferenceLine y={snapshot.todayHigh} stroke="#4ade80" strokeDasharray="5 5" label={{ value: `High ${snapshot.todayHigh}`, position: "right", fontSize: 9, fill: "#4ade80" }} />}
          {snapshot.todayLow != null && <ReferenceLine y={snapshot.todayLow} stroke="#f87171" strokeDasharray="5 5" label={{ value: `Low ${snapshot.todayLow}`, position: "right", fontSize: 9, fill: "#f87171" }} />}
          <Area type="monotone" dataKey="price" stroke="#22c55e" fill="url(#priceGrad)" strokeWidth={2} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
