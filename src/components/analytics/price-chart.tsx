"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { TimeSeriesPoint, StockSnapshot } from "@/types/analytics";

interface Props {
  data: TimeSeriesPoint[];
  snapshot: StockSnapshot;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function PriceChart({ data, snapshot }: Props) {
  const chartData = data.map((d) => ({
    time: formatTime(d.scrapedAt),
    price: d.lastTradePrice,
  }));

  const prices = data.map((d) => d.lastTradePrice).filter((p): p is number => p != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) * 0.998 : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) * 1.002 : 100;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Price Movement</h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip
            formatter={(value) => [Number(value).toFixed(2), "Price (SAR)"]}
            labelStyle={{ fontWeight: 600 }}
          />
          {snapshot.todayOpen != null && (
            <ReferenceLine y={snapshot.todayOpen} stroke="#6366f1" strokeDasharray="5 5" label={{ value: `Open: ${snapshot.todayOpen}`, position: "right", fontSize: 10 }} />
          )}
          {snapshot.todayHigh != null && (
            <ReferenceLine y={snapshot.todayHigh} stroke="#16a34a" strokeDasharray="5 5" label={{ value: `High: ${snapshot.todayHigh}`, position: "right", fontSize: 10 }} />
          )}
          {snapshot.todayLow != null && (
            <ReferenceLine y={snapshot.todayLow} stroke="#dc2626" strokeDasharray="5 5" label={{ value: `Low: ${snapshot.todayLow}`, position: "right", fontSize: 10 }} />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(142.1, 76.2%, 36.3%)"
            fill="url(#priceGradient)"
            strokeWidth={2}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
