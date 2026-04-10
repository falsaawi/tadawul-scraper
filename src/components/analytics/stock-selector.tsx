"use client";

import { Search, TrendingUp, TrendingDown } from "lucide-react";

interface StockOption { symbol: string; companyName: string; }

interface Props {
  stocks: StockOption[];
  selectedSymbol: string;
  selectedDate: string;
  onSymbolChange: (symbol: string) => void;
  onDateChange: (date: string) => void;
  snapshot?: { lastTradePrice: number | null; lastTradeChange: number | null; lastTradePctChange: number | null; };
}

export function StockSelector({ stocks, selectedSymbol, selectedDate, onSymbolChange, onDateChange, snapshot }: Props) {
  const change = snapshot?.lastTradePctChange ?? 0;
  const isPositive = change > 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Stock</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={selectedSymbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">-- Market Overview --</option>
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.companyName}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      {selectedSymbol && snapshot?.lastTradePrice != null && (
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</div>
            <div className="text-2xl font-bold text-foreground">{snapshot.lastTradePrice.toFixed(2)}</div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border ${
            isPositive ? "bg-green-500/10 text-green-400 border-green-500/20" : change < 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-accent text-muted-foreground border-border"
          }`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}{snapshot.lastTradeChange?.toFixed(2)} ({isPositive ? "+" : ""}{change.toFixed(2)}%)
          </div>
        </div>
      )}
    </div>
  );
}
