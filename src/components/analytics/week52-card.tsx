"use client";

import { Compass } from "lucide-react";
import type { StockAnalysis, StockSnapshot } from "@/types/analytics";

interface Props {
  analysis: StockAnalysis;
  snapshot: StockSnapshot;
}

export function Week52Card({ analysis, snapshot }: Props) {
  const { week52High, week52Low, lastTradePrice } = snapshot;
  if (week52High == null || week52Low == null || lastTradePrice == null) return null;

  const position = analysis.week52Position;
  const fromHigh = week52High - lastTradePrice;
  const fromHighPct = week52High > 0 ? (fromHigh / week52High) * 100 : 0;
  const fromLow = lastTradePrice - week52Low;
  const fromLowPct = week52Low > 0 ? (fromLow / week52Low) * 100 : 0;

  let sentiment = "";
  let sentimentColor = "";
  if (position > 80) {
    sentiment = "Near 52-week high — strong momentum, but may face resistance.";
    sentimentColor = "text-green-600";
  } else if (position > 50) {
    sentiment = "Upper half of 52-week range — positive trend.";
    sentimentColor = "text-green-500";
  } else if (position > 20) {
    sentiment = "Lower half of 52-week range — potential value opportunity.";
    sentimentColor = "text-yellow-600";
  } else {
    sentiment = "Near 52-week low — significant weakness or potential turnaround.";
    sentimentColor = "text-red-600";
  }

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="h-5 w-5 text-cyan-600" />
        <h3 className="font-semibold text-sm">52-Week Position</h3>
      </div>

      <div className="mb-4">
        <div className="text-center text-2xl font-bold mb-2">{position.toFixed(1)}%</div>
        {/* Range bar */}
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-400 via-yellow-300 to-green-400 rounded-full"
            style={{ width: "100%" }}
          />
          <div
            className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full"
            style={{ left: `${position}%`, marginLeft: "-2px" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{week52Low.toFixed(2)}</span>
          <span className="font-medium">{lastTradePrice.toFixed(2)}</span>
          <span>{week52High.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">From 52W High</div>
          <div className="text-sm font-medium text-red-600">-{fromHigh.toFixed(2)} (-{fromHighPct.toFixed(1)}%)</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">From 52W Low</div>
          <div className="text-sm font-medium text-green-600">+{fromLow.toFixed(2)} (+{fromLowPct.toFixed(1)}%)</div>
        </div>
      </div>

      <div className={`p-3 bg-secondary/50 rounded-lg text-xs ${sentimentColor}`}>
        {sentiment}
      </div>
    </div>
  );
}
