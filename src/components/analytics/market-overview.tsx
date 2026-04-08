"use client";

import { TrendingUp, TrendingDown, Flame, BarChart3 } from "lucide-react";
import type { MarketMover, MarketStats } from "@/types/analytics";

interface Props {
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  mostActive: MarketMover[];
  marketStats: MarketStats;
  onSelectStock?: (symbol: string) => void;
}

function MiniTable({
  title,
  icon,
  stocks,
  showChange,
  showVolume,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  stocks: MarketMover[];
  showChange?: boolean;
  showVolume?: boolean;
  onSelect?: (symbol: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {stocks.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No data</div>
      ) : (
        <div className="space-y-2">
          {stocks.map((s) => (
            <div
              key={s.symbol}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              onClick={() => onSelect?.(s.symbol)}
            >
              <div>
                <div className="text-sm font-medium">{s.symbol}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[120px]">{s.companyName}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{s.lastTradePrice?.toFixed(2) ?? "-"}</div>
                {showChange && s.lastTradePctChange != null && (
                  <div
                    className={`text-xs font-medium ${
                      s.lastTradePctChange > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {s.lastTradePctChange > 0 ? "+" : ""}
                    {s.lastTradePctChange.toFixed(2)}%
                  </div>
                )}
                {showVolume && s.cumulativeVolume != null && (
                  <div className="text-xs text-muted-foreground">
                    {(s.cumulativeVolume / 1000000).toFixed(1)}M vol
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketOverview({ topGainers, topLosers, mostActive, marketStats, onSelectStock }: Props) {
  return (
    <div className="space-y-6">
      {/* Market breadth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-xs text-muted-foreground">Total Stocks</div>
          <div className="text-2xl font-bold">{marketStats.totalStocks}</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-xs text-muted-foreground">Gainers</div>
          <div className="text-2xl font-bold text-green-600">{marketStats.gainers}</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-xs text-muted-foreground">Losers</div>
          <div className="text-2xl font-bold text-red-600">{marketStats.losers}</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-xs text-muted-foreground">Unchanged</div>
          <div className="text-2xl font-bold text-gray-500">{marketStats.unchanged}</div>
        </div>
      </div>

      {/* Market breadth bar */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Market Breadth</span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden">
          {marketStats.gainers > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${(marketStats.gainers / marketStats.totalStocks) * 100}%` }}
            />
          )}
          {marketStats.unchanged > 0 && (
            <div
              className="bg-gray-300"
              style={{ width: `${(marketStats.unchanged / marketStats.totalStocks) * 100}%` }}
            />
          )}
          {marketStats.losers > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(marketStats.losers / marketStats.totalStocks) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span className="text-green-600">{marketStats.gainers} gainers</span>
          <span>Total volume: {(marketStats.totalVolume / 1000000).toFixed(1)}M</span>
          <span className="text-red-600">{marketStats.losers} losers</span>
        </div>
      </div>

      {/* Three mini-tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniTable
          title="Top Gainers"
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          stocks={topGainers}
          showChange
          onSelect={onSelectStock}
        />
        <MiniTable
          title="Top Losers"
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
          stocks={topLosers}
          showChange
          onSelect={onSelectStock}
        />
        <MiniTable
          title="Most Active"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          stocks={mostActive}
          showVolume
          onSelect={onSelectStock}
        />
      </div>
    </div>
  );
}
