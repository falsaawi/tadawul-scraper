"use client";

import { Scale } from "lucide-react";
import type { StockAnalysis, StockSnapshot } from "@/types/analytics";

interface Props {
  analysis: StockAnalysis;
  snapshot: StockSnapshot;
}

export function VwapCard({ analysis, snapshot }: Props) {
  const price = snapshot.lastTradePrice ?? 0;
  const vwap = analysis.vwap;
  const deviation = price > 0 ? ((price - vwap) / vwap) * 100 : 0;
  const isAbove = price > vwap;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-amber-600" />
        <h3 className="font-semibold text-sm">VWAP Analysis</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-muted-foreground">VWAP</div>
          <div className="text-lg font-bold">{vwap.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current Price</div>
          <div className="text-lg font-bold">{price.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Deviation</div>
          <div className={`text-sm font-medium ${isAbove ? "text-green-600" : "text-red-600"}`}>
            {isAbove ? "+" : ""}{deviation.toFixed(3)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Signal</div>
          <div className={`text-sm font-medium ${isAbove ? "text-green-600" : "text-red-600"}`}>
            {isAbove ? "Buying Pressure" : "Selling Pressure"}
          </div>
        </div>
      </div>

      <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
        {isAbove
          ? "Price is trading above VWAP, suggesting institutional buying interest and bullish intraday sentiment."
          : "Price is trading below VWAP, suggesting selling pressure and bearish intraday sentiment."}
      </div>
    </div>
  );
}
