"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpDown, Search } from "lucide-react";

interface StockRecord {
  id: string;
  symbol: string;
  companyName: string;
  week52High: number | null;
  week52Low: number | null;
  lastTradePrice: number | null;
  lastTradeVolume: number | null;
  lastTradeChange: number | null;
  lastTradePctChange: number | null;
  numberOfTrades: number | null;
  cumulativeVolume: number | null;
  todayOpen: number | null;
  todayHigh: number | null;
  todayLow: number | null;
  bestBidPrice: number | null;
  bestBidQuantity: number | null;
  bestOfferPrice: number | null;
  bestOfferQuantity: number | null;
}

function fmt(val: number | null, decimals = 2): string {
  if (val == null) return "-";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(val: number | null): string {
  if (val == null) return "-";
  return Math.round(val).toLocaleString("en-US");
}

export function MarketTable({ refreshKey }: { refreshKey: number }) {
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof StockRecord>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data?latest=true&limit=200");
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const filtered = records.filter(
    (r) =>
      r.symbol.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(field: keyof StockRecord) {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  const SortHeader = ({
    field,
    children,
  }: {
    field: keyof StockRecord;
    children: React.ReactNode;
  }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Latest Market Data</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by symbol or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          <div className="animate-pulse">Loading market data...</div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          No data available. Trigger a scrape to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <SortHeader field="symbol">Symbol</SortHeader>
                <SortHeader field="companyName">Company</SortHeader>
                <SortHeader field="week52Low">52W Range</SortHeader>
                <SortHeader field="lastTradePrice">Price</SortHeader>
                <SortHeader field="lastTradeVolume">Vol</SortHeader>
                <SortHeader field="lastTradeChange">Change</SortHeader>
                <SortHeader field="lastTradePctChange">%</SortHeader>
                <SortHeader field="numberOfTrades">Trades</SortHeader>
                <SortHeader field="cumulativeVolume">Cum Vol</SortHeader>
                <SortHeader field="todayOpen">Open</SortHeader>
                <SortHeader field="todayHigh">High</SortHeader>
                <SortHeader field="todayLow">Low</SortHeader>
                <SortHeader field="bestBidPrice">Bid</SortHeader>
                <SortHeader field="bestOfferPrice">Offer</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-medium">{r.symbol}</td>
                  <td className="px-3 py-2.5 text-sm max-w-[200px] truncate">{r.companyName}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(r.week52Low)} - {fmt(r.week52High)}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium">{fmt(r.lastTradePrice)}</td>
                  <td className="px-3 py-2.5 text-sm">{fmtInt(r.lastTradeVolume)}</td>
                  <td
                    className={`px-3 py-2.5 text-sm font-medium ${
                      r.lastTradeChange != null
                        ? r.lastTradeChange > 0
                          ? "text-green-600"
                          : r.lastTradeChange < 0
                          ? "text-red-600"
                          : ""
                        : ""
                    }`}
                  >
                    {r.lastTradeChange != null && r.lastTradeChange > 0 ? "+" : ""}
                    {fmt(r.lastTradeChange)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-sm font-medium ${
                      r.lastTradePctChange != null
                        ? r.lastTradePctChange > 0
                          ? "text-green-600"
                          : r.lastTradePctChange < 0
                          ? "text-red-600"
                          : ""
                        : ""
                    }`}
                  >
                    {r.lastTradePctChange != null && r.lastTradePctChange > 0 ? "+" : ""}
                    {fmt(r.lastTradePctChange)}%
                  </td>
                  <td className="px-3 py-2.5 text-sm">{fmtInt(r.numberOfTrades)}</td>
                  <td className="px-3 py-2.5 text-sm">{fmtInt(r.cumulativeVolume)}</td>
                  <td className="px-3 py-2.5 text-sm">{fmt(r.todayOpen)}</td>
                  <td className="px-3 py-2.5 text-sm">{fmt(r.todayHigh)}</td>
                  <td className="px-3 py-2.5 text-sm">{fmt(r.todayLow)}</td>
                  <td className="px-3 py-2.5 text-sm">
                    {fmt(r.bestBidPrice)}
                    {r.bestBidQuantity != null && (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({fmtInt(r.bestBidQuantity)})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    {fmt(r.bestOfferPrice)}
                    {r.bestOfferQuantity != null && (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({fmtInt(r.bestOfferQuantity)})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="p-3 border-t text-sm text-muted-foreground">
          Showing {sorted.length} of {records.length} stocks
        </div>
      )}
    </div>
  );
}
