"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { ArrowUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface StockRecord {
  id: string;
  symbol: string;
  companyName: string;
  scrapedAt: string;
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
  session?: { startedAt: string; status: string };
}

interface Session {
  id: string;
  startedAt: string;
  status: string;
  rowCount: number;
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

export default function DataExplorerPage() {
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch sessions for dropdown
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/logs?limit=100");
        const data = await res.json();
        setSessions(
          (data.sessions || []).filter((s: Session) => s.status === "completed")
        );
      } catch {
        // ignore
      }
    }
    fetchSessions();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSession) params.set("session", selectedSession);
      else params.set("latest", "true");
      if (search) params.set("symbol", search);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`/api/data?${params}`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedSession, search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [selectedSession, search]);

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Data Explorer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and filter all scraped market data
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm min-w-[250px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Latest Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.startedAt).toLocaleString("en-US", {
                    timeZone: "Asia/Riyadh",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}{" "}
                  ({s.rowCount} stocks)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Symbol or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            {total} records found
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">
              Loading data...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No data found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Scraped At
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      52W Range
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Vol
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      %
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Trades
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cum Vol
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Open
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      High
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Low
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Bid
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Offer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.scrapedAt).toLocaleTimeString("en-US", {
                          timeZone: "Asia/Riyadh",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium">{r.symbol}</td>
                      <td className="px-3 py-2.5 text-sm max-w-[180px] truncate">
                        {r.companyName}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(r.week52Low)} - {fmt(r.week52High)}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium">
                        {fmt(r.lastTradePrice)}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{fmtInt(r.lastTradeVolume)}</td>
                      <td
                        className={`px-3 py-2.5 text-sm font-medium ${
                          (r.lastTradeChange ?? 0) > 0
                            ? "text-green-600"
                            : (r.lastTradeChange ?? 0) < 0
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {(r.lastTradeChange ?? 0) > 0 ? "+" : ""}
                        {fmt(r.lastTradeChange)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-sm font-medium ${
                          (r.lastTradePctChange ?? 0) > 0
                            ? "text-green-600"
                            : (r.lastTradePctChange ?? 0) < 0
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {(r.lastTradePctChange ?? 0) > 0 ? "+" : ""}
                        {fmt(r.lastTradePctChange)}%
                      </td>
                      <td className="px-3 py-2.5 text-sm">{fmtInt(r.numberOfTrades)}</td>
                      <td className="px-3 py-2.5 text-sm">{fmtInt(r.cumulativeVolume)}</td>
                      <td className="px-3 py-2.5 text-sm">{fmt(r.todayOpen)}</td>
                      <td className="px-3 py-2.5 text-sm">{fmt(r.todayHigh)}</td>
                      <td className="px-3 py-2.5 text-sm">{fmt(r.todayLow)}</td>
                      <td className="px-3 py-2.5 text-sm">{fmt(r.bestBidPrice)}</td>
                      <td className="px-3 py-2.5 text-sm">{fmt(r.bestOfferPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-3 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-secondary transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
