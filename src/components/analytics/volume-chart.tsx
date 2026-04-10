"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";
import type { TimeSeriesPoint } from "@/types/analytics";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtK(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
}

export function VolumeChart({ data }: { data: TimeSeriesPoint[] }) {
  const chartData = data.map((d) => ({ time: formatTime(d.scrapedAt), tradeVolume: d.lastTradeVolume, cumVolume: d.cumulativeVolume }));

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-foreground">Volume Analysis</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 16%)" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} stroke="hsl(215 20% 16%)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} tickFormatter={fmtK} stroke="hsl(215 20% 16%)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(215 16% 56%)" }} tickFormatter={fmtK} stroke="hsl(215 20% 16%)" />
          <Tooltip contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: "8px", color: "hsl(210 40% 92%)", fontSize: 12 }}
            formatter={(value, name) => [fmtK(Number(value)), name === "tradeVolume" ? "Trade Volume" : "Cumulative"]} />
          <Legend wrapperStyle={{ fontSize: 11, color: "hsl(215 16% 56%)" }} />
          <Bar yAxisId="left" dataKey="tradeVolume" name="Trade Volume" fill="#3b82f6" opacity={0.7} radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" dataKey="cumVolume" name="Cumulative" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
