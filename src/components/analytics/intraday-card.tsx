"use client";

import { CandlestickChart } from "lucide-react";
import type { StockSnapshot } from "@/types/analytics";

export function IntradayCard({ snapshot }: { snapshot: StockSnapshot }) {
  const { todayOpen, todayHigh, todayLow, lastTradePrice } = snapshot;
  if (todayHigh == null || todayLow == null) return null;

  const range = todayHigh - todayLow;
  const currentPct = range > 0 && lastTradePrice != null ? ((lastTradePrice - todayLow) / range) * 100 : 50;
  const openPct = range > 0 && todayOpen != null ? ((todayOpen - todayLow) / range) * 100 : 0;

  const items = [
    { label: "Open", value: todayOpen, color: "text-indigo-600" },
    { label: "High", value: todayHigh, color: "text-green-600" },
    { label: "Low", value: todayLow, color: "text-red-600" },
    { label: "Current", value: lastTradePrice, color: "text-foreground font-bold" },
  ];

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <CandlestickChart className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-sm">Intraday Movement</h3>
      </div>

      {/* Visual range bar */}
      <div className="mb-4">
        <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-200 via-yellow-100 to-green-200 w-full rounded-full" />
          {/* Open marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-500" style={{ left: `${openPct}%` }} />
          {/* Current marker */}
          <div
            className="absolute top-1 bottom-1 w-3 bg-foreground rounded-full -ml-1.5"
            style={{ left: `${currentPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Low: {todayLow?.toFixed(2)}</span>
          <span>High: {todayHigh?.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className={`text-sm ${item.color}`}>
              {item.value?.toFixed(2) ?? "-"}
            </div>
          </div>
        ))}
      </div>
      {range > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          Daily range: {range.toFixed(2)} SAR ({((range / (todayLow || 1)) * 100).toFixed(2)}%)
        </div>
      )}
    </div>
  );
}
