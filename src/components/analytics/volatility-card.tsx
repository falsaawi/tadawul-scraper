"use client";

import { Activity } from "lucide-react";
import type { StockAnalysis, StockSnapshot } from "@/types/analytics";

interface Props {
  analysis: StockAnalysis;
  snapshot: StockSnapshot;
}

function getVolatilityRating(vol: number, price: number): { label: string; color: string; bg: string } {
  const pct = price > 0 ? (vol / price) * 100 : 0;
  if (pct < 0.1) return { label: "Low", color: "text-green-600", bg: "bg-green-100" };
  if (pct < 0.3) return { label: "Medium", color: "text-yellow-600", bg: "bg-yellow-100" };
  return { label: "High", color: "text-red-600", bg: "bg-red-100" };
}

export function VolatilityCard({ analysis, snapshot }: Props) {
  const price = snapshot.lastTradePrice ?? 1;
  const rating = getVolatilityRating(analysis.priceVolatility, price);
  const maxSwing = analysis.priceRange.spread;
  const maxSwingPct = price > 0 ? (maxSwing / price) * 100 : 0;
  const volPct = price > 0 ? (analysis.priceVolatility / price) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-sm">Price Volatility</h3>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${rating.color} ${rating.bg}`}>
          {rating.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Std Deviation</div>
          <div className="text-sm font-medium">{analysis.priceVolatility.toFixed(4)} SAR</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Volatility %</div>
          <div className="text-sm font-medium">{volPct.toFixed(4)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Max Day Swing</div>
          <div className="text-sm font-medium">{maxSwing.toFixed(2)} SAR</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Max Swing %</div>
          <div className="text-sm font-medium">{maxSwingPct.toFixed(2)}%</div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
        {rating.label === "Low"
          ? "Low volatility indicates stable price action with minimal fluctuation — suitable for conservative positions."
          : rating.label === "Medium"
          ? "Moderate volatility — normal trading range with occasional price swings."
          : "High volatility signals significant price swings — indicates strong market activity or uncertainty."}
      </div>
    </div>
  );
}
