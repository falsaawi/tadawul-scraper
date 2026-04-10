"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  BarChart3,
  Activity,
  Target,
  ArrowLeftRight,
  Zap,
  DollarSign,
  Hash,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

interface MarketMover {
  symbol: string;
  companyName: string;
  lastTradePrice: number | null;
  lastTradeChange?: number | null;
  lastTradePctChange: number | null;
  cumulativeVolume: number | null;
  numberOfTrades: number | null;
  todayOpen?: number | null;
  todayHigh?: number | null;
  todayLow?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
  swingPct?: number;
  pctFrom52High?: number;
  pctFrom52Low?: number;
  spreadPct?: number;
}

interface MarketStats {
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  totalTrades: number;
  totalValue: number;
  avgChange: number;
  changeDist: {
    up3: number;
    up1to3: number;
    up0to1: number;
    flat: number;
    down0to1: number;
    down1to3: number;
    down3: number;
  };
}

interface Props {
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  mostActiveByVolume: MarketMover[];
  mostActiveByTrades: MarketMover[];
  biggestSwings: MarketMover[];
  near52High: MarketMover[];
  near52Low: MarketMover[];
  widestSpreads: MarketMover[];
  tightestSpreads: MarketMover[];
  marketStats: MarketStats;
  onSelectStock?: (symbol: string) => void;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "-";
  if (Math.abs(n) >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(2);
}

function StockRow({
  stock,
  extraLabel,
  extraValue,
  extraColor,
  onSelect,
}: {
  stock: MarketMover;
  extraLabel?: string;
  extraValue?: string;
  extraColor?: string;
  onSelect?: (symbol: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
      onClick={() => onSelect?.(stock.symbol)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{stock.symbol}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {stock.companyName}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div>
          <div className="text-sm font-medium">{stock.lastTradePrice?.toFixed(2) ?? "-"}</div>
          {stock.lastTradePctChange != null && (
            <div
              className={`text-xs font-medium ${
                stock.lastTradePctChange > 0
                  ? "text-green-600"
                  : stock.lastTradePctChange < 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {stock.lastTradePctChange > 0 ? "+" : ""}
              {stock.lastTradePctChange.toFixed(2)}%
            </div>
          )}
        </div>
        {extraValue && (
          <div className="min-w-[70px]">
            <div className={`text-xs font-medium ${extraColor || "text-muted-foreground"}`}>
              {extraValue}
            </div>
            {extraLabel && (
              <div className="text-[10px] text-muted-foreground">{extraLabel}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DataCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b bg-secondary/20">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">{children}</div>
    </div>
  );
}

const TABS = [
  { key: "movers", label: "Price Movers", icon: TrendingUp },
  { key: "activity", label: "Activity", icon: Flame },
  { key: "volatility", label: "Volatility & Range", icon: Activity },
  { key: "liquidity", label: "Liquidity", icon: ArrowLeftRight },
] as const;

type TabKey = typeof TABS[number]["key"];

export function MarketOverview({
  topGainers,
  topLosers,
  mostActiveByVolume,
  mostActiveByTrades,
  biggestSwings,
  near52High,
  near52Low,
  widestSpreads,
  tightestSpreads,
  marketStats,
  onSelectStock,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("movers");

  const distData = [
    { name: ">+3%", value: marketStats.changeDist.up3, color: "#15803d" },
    { name: "+1~3%", value: marketStats.changeDist.up1to3, color: "#22c55e" },
    { name: "0~+1%", value: marketStats.changeDist.up0to1, color: "#86efac" },
    { name: "0%", value: marketStats.changeDist.flat, color: "#d1d5db" },
    { name: "0~-1%", value: marketStats.changeDist.down0to1, color: "#fca5a5" },
    { name: "-1~3%", value: marketStats.changeDist.down1to3, color: "#ef4444" },
    { name: "<-3%", value: marketStats.changeDist.down3, color: "#991b1b" },
  ];

  const sentiment = marketStats.avgChange > 0.3 ? "Bullish" : marketStats.avgChange < -0.3 ? "Bearish" : "Neutral";
  const sentimentColor = marketStats.avgChange > 0.3 ? "text-green-600" : marketStats.avgChange < -0.3 ? "text-red-600" : "text-yellow-600";
  const sentimentBg = marketStats.avgChange > 0.3 ? "bg-green-50" : marketStats.avgChange < -0.3 ? "bg-red-50" : "bg-yellow-50";

  return (
    <div className="space-y-6">
      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Stocks</div>
          <div className="text-xl font-bold">{marketStats.totalStocks}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Gainers</div>
          <div className="text-xl font-bold text-green-600">{marketStats.gainers}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Losers</div>
          <div className="text-xl font-bold text-red-600">{marketStats.losers}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Unchanged</div>
          <div className="text-xl font-bold text-gray-400">{marketStats.unchanged}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume</div>
          <div className="text-xl font-bold">{fmtNum(marketStats.totalVolume)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Trades</div>
          <div className="text-xl font-bold">{fmtNum(marketStats.totalTrades)}</div>
        </div>
        <div className={`rounded-xl border p-3 text-center ${sentimentBg}`}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sentiment</div>
          <div className={`text-xl font-bold ${sentimentColor}`}>{sentiment}</div>
          <div className={`text-xs ${sentimentColor}`}>Avg: {marketStats.avgChange > 0 ? "+" : ""}{marketStats.avgChange.toFixed(2)}%</div>
        </div>
      </div>

      {/* Market breadth bar + change distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Market Breadth</span>
          </div>
          <div className="flex h-6 rounded-full overflow-hidden mb-2">
            {marketStats.gainers > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-[10px] font-medium"
                style={{ width: `${(marketStats.gainers / marketStats.totalStocks) * 100}%` }}
              >
                {((marketStats.gainers / marketStats.totalStocks) * 100).toFixed(0)}%
              </div>
            )}
            {marketStats.unchanged > 0 && (
              <div
                className="bg-gray-500 flex items-center justify-center text-gray-300 text-[10px] font-medium"
                style={{ width: `${(marketStats.unchanged / marketStats.totalStocks) * 100}%` }}
              >
                {((marketStats.unchanged / marketStats.totalStocks) * 100).toFixed(0)}%
              </div>
            )}
            {marketStats.losers > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-white text-[10px] font-medium"
                style={{ width: `${(marketStats.losers / marketStats.totalStocks) * 100}%` }}
              >
                {((marketStats.losers / marketStats.totalStocks) * 100).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-3">
            <div className="text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
              <span className="text-green-600 font-medium">{marketStats.gainers} Advancing</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1" />
              <span className="text-gray-500 font-medium">{marketStats.unchanged} Flat</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />
              <span className="text-red-600 font-medium">{marketStats.losers} Declining</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Total Value Traded:</span>
              <span className="font-medium ml-1">{fmtNum(marketStats.totalValue)} SAR</span>
            </div>
            <div>
              <span className="text-muted-foreground">Advance/Decline:</span>
              <span className={`font-medium ml-1 ${marketStats.gainers > marketStats.losers ? "text-green-600" : "text-red-600"}`}>
                {(marketStats.gainers / (marketStats.losers || 1)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Change Distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={distData} layout="horizontal">
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [value, "Stocks"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {distData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-card rounded-xl border border-border p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "movers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataCard title="Top 10 Gainers" icon={<TrendingUp className="h-4 w-4 text-green-600" />}>
            <div className="p-2">
              {topGainers.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={s.cumulativeVolume != null ? fmtNum(s.cumulativeVolume) : undefined}
                  extraLabel="volume"
                  onSelect={onSelectStock}
                />
              ))}
              {topGainers.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No gainers</div>}
            </div>
          </DataCard>
          <DataCard title="Top 10 Losers" icon={<TrendingDown className="h-4 w-4 text-red-600" />}>
            <div className="p-2">
              {topLosers.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={s.cumulativeVolume != null ? fmtNum(s.cumulativeVolume) : undefined}
                  extraLabel="volume"
                  onSelect={onSelectStock}
                />
              ))}
              {topLosers.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No losers</div>}
            </div>
          </DataCard>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataCard title="Most Active by Volume" icon={<DollarSign className="h-4 w-4 text-blue-600" />}>
            <div className="p-2">
              {mostActiveByVolume.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={fmtNum(s.cumulativeVolume)}
                  extraLabel="shares"
                  extraColor="text-blue-600"
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
          <DataCard title="Most Active by Trades" icon={<Hash className="h-4 w-4 text-purple-600" />}>
            <div className="p-2">
              {mostActiveByTrades.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={fmtNum(s.numberOfTrades)}
                  extraLabel="trades"
                  extraColor="text-purple-600"
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
        </div>
      )}

      {activeTab === "volatility" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DataCard title="Biggest Price Swings" icon={<Zap className="h-4 w-4 text-orange-600" />}>
            <div className="p-2">
              {biggestSwings.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={`${s.swingPct?.toFixed(2)}%`}
                  extraLabel="swing"
                  extraColor="text-orange-600"
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
          <DataCard title="Near 52-Week High" icon={<Target className="h-4 w-4 text-green-600" />}>
            <div className="p-2">
              {near52High.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={`${s.pctFrom52High != null && s.pctFrom52High > 0 ? "+" : ""}${s.pctFrom52High?.toFixed(1)}%`}
                  extraLabel="from high"
                  extraColor={s.pctFrom52High != null && s.pctFrom52High >= 0 ? "text-green-600" : "text-red-600"}
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
          <DataCard title="Near 52-Week Low" icon={<Target className="h-4 w-4 text-red-600" />}>
            <div className="p-2">
              {near52Low.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={`+${s.pctFrom52Low?.toFixed(1)}%`}
                  extraLabel="from low"
                  extraColor="text-red-600"
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
        </div>
      )}

      {activeTab === "liquidity" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataCard title="Most Liquid (Tightest Spread)" icon={<ArrowLeftRight className="h-4 w-4 text-green-600" />}>
            <div className="p-2">
              {tightestSpreads.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={`${s.spreadPct?.toFixed(3)}%`}
                  extraLabel="spread"
                  extraColor="text-green-600"
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
          <DataCard title="Least Liquid (Widest Spread)" icon={<ArrowLeftRight className="h-4 w-4 text-red-600" />}>
            <div className="p-2">
              {widestSpreads.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  extraValue={`${s.spreadPct?.toFixed(3)}%`}
                  extraLabel="spread"
                  extraColor="text-red-600"
                  onSelect={onSelectStock}
                />
              ))}
            </div>
          </DataCard>
        </div>
      )}
    </div>
  );
}
