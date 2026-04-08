"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { TimeSeriesPoint } from "@/types/analytics";

interface Props {
  data: TimeSeriesPoint[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtK(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
}

export function VolumeChart({ data }: Props) {
  const chartData = data.map((d) => ({
    time: formatTime(d.scrapedAt),
    tradeVolume: d.lastTradeVolume,
    cumVolume: d.cumulativeVolume,
  }));

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold">Volume Analysis</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <Tooltip formatter={(value, name) => [fmtK(Number(value)), name === "tradeVolume" ? "Trade Volume" : "Cumulative Volume"]} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="tradeVolume"
            name="Trade Volume"
            fill="hsl(217, 91%, 60%)"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            dataKey="cumVolume"
            name="Cumulative Volume"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
