"use client";

import { Search, TrendingUp, TrendingDown } from "lucide-react";

interface StockOption {
  symbol: string;
  companyName: string;
}

interface Props {
  stocks: StockOption[];
  selectedSymbol: string;
  selectedDate: string;
  onSymbolChange: (symbol: string) => void;
  onDateChange: (date: string) => void;
  snapshot?: {
    lastTradePrice: number | null;
    lastTradeChange: number | null;
    lastTradePctChange: number | null;
  };
}

export function StockSelector({
  stocks,
  selectedSymbol,
  selectedDate,
  onSymbolChange,
  onDateChange,
  snapshot,
}: Props) {
  const change = snapshot?.lastTradePctChange ?? 0;
  const isPositive = change > 0;

  return (
    <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Select Stock
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={selectedSymbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Market Overview --</option>
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} - {s.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {selectedSymbol && snapshot?.lastTradePrice != null && (
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Last Price</div>
            <div className="text-2xl font-bold">{snapshot.lastTradePrice.toFixed(2)}</div>
          </div>
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              isPositive ? "bg-green-50 text-green-700" : change < 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
            }`}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}
            {snapshot.lastTradeChange?.toFixed(2)} ({isPositive ? "+" : ""}
            {change.toFixed(2)}%)
          </div>
        </div>
      )}
    </div>
  );
}
