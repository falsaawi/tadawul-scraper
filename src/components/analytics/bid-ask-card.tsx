"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ArrowLeftRight } from "lucide-react";
import type { TimeSeriesPoint, StockAnalysis } from "@/types/analytics";

interface Props {
  data: TimeSeriesPoint[];
  analysis: StockAnalysis;
  snapshot: { bestBidPrice: number | null; bestOfferPrice: number | null };
}

function getLiquidityRating(spreadPct: number): { label: string; color: string } {
  if (spreadPct < 0.1) return { label: "Very Tight (High Liquidity)", color: "text-green-600" };
  if (spreadPct < 0.3) return { label: "Tight (Good Liquidity)", color: "text-green-500" };
  if (spreadPct < 0.5) return { label: "Normal", color: "text-yellow-600" };
  if (spreadPct < 1) return { label: "Wide (Low Liquidity)", color: "text-orange-600" };
  return { label: "Very Wide (Poor Liquidity)", color: "text-red-600" };
}

export function BidAskCard({ data, analysis, snapshot }: Props) {
  const currentSpread =
    snapshot.bestBidPrice != null && snapshot.bestOfferPrice != null
      ? snapshot.bestOfferPrice - snapshot.bestBidPrice
      : null;

  const sparkData = data
    .filter((d) => d.bestBidPrice != null && d.bestOfferPrice != null)
    .map((d) => ({
      spread: (d.bestOfferPrice! - d.bestBidPrice!),
    }));

  const rating = getLiquidityRating(analysis.avgBidAskSpreadPct);

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-sm">Bid-Ask Spread</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Current Spread</div>
          <div className="text-sm font-medium">{currentSpread?.toFixed(3) ?? "-"} SAR</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Spread</div>
          <div className="text-sm font-medium">{analysis.avgBidAskSpread.toFixed(3)} SAR</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Spread %</div>
          <div className="text-sm font-medium">{analysis.avgBidAskSpreadPct.toFixed(3)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Liquidity</div>
          <div className={`text-sm font-medium ${rating.color}`}>{rating.label}</div>
        </div>
      </div>

      {sparkData.length > 2 && (
        <div className="mt-2">
          <div className="text-xs text-muted-foreground mb-1">Spread Over Time</div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="spread" stroke="#9333ea" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        Bid: {snapshot.bestBidPrice?.toFixed(2) ?? "-"} | Offer: {snapshot.bestOfferPrice?.toFixed(2) ?? "-"}
      </div>
    </div>
  );
}
