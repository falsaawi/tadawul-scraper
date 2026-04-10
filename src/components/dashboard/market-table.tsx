"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpDown, Search, ChevronDown, ChevronUp } from "lucide-react";

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
  return val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
  const [expanded, setExpanded] = useState(false);

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

  const visible = expanded || search ? sorted : sorted.slice(0, 20);

  function toggleSort(field: keyof StockRecord) {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  }

  const SortHeader = ({ field, children }: { field: keyof StockRecord; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      </div>
    </th>
  );

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Market Data</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs w-48 focus:outline-none focus:ring-1 focus:ring-primary/30 bg-input text-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground text-sm animate-pulse">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground text-sm">No data. Trigger a scrape to get started.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent/30">
                <tr>
                  <SortHeader field="symbol">Symbol</SortHeader>
                  <SortHeader field="companyName">Company</SortHeader>
                  <SortHeader field="lastTradePrice">Price</SortHeader>
                  <SortHeader field="lastTradeChange">Change</SortHeader>
                  <SortHeader field="lastTradePctChange">%</SortHeader>
                  <SortHeader field="lastTradeVolume">Vol</SortHeader>
                  <SortHeader field="todayOpen">Open</SortHeader>
                  <SortHeader field="todayHigh">High</SortHeader>
                  <SortHeader field="todayLow">Low</SortHeader>
                  <SortHeader field="cumulativeVolume">Cum Vol</SortHeader>
                  <SortHeader field="bestBidPrice">Bid</SortHeader>
                  <SortHeader field="bestOfferPrice">Offer</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{r.symbol}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[140px] truncate">{r.companyName}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{fmt(r.lastTradePrice)}</td>
                    <td className={`px-3 py-2 text-xs font-medium ${(r.lastTradeChange ?? 0) > 0 ? "text-green-400" : (r.lastTradeChange ?? 0) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {(r.lastTradeChange ?? 0) > 0 ? "+" : ""}{fmt(r.lastTradeChange)}
                    </td>
                    <td className={`px-3 py-2 text-xs font-medium ${(r.lastTradePctChange ?? 0) > 0 ? "text-green-400" : (r.lastTradePctChange ?? 0) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {(r.lastTradePctChange ?? 0) > 0 ? "+" : ""}{fmt(r.lastTradePctChange)}%
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtInt(r.lastTradeVolume)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmt(r.todayOpen)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmt(r.todayHigh)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmt(r.todayLow)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtInt(r.cumulativeVolume)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmt(r.bestBidPrice)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmt(r.bestOfferPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!search && sorted.length > 20 && (
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {visible.length} of {sorted.length}
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
              >
                {expanded ? (
                  <>Collapse <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Show all ({sorted.length}) <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
