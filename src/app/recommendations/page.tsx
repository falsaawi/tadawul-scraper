"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Award, ArrowUpDown, Search, Filter, TrendingUp, TrendingDown } from "lucide-react";

interface Assessment {
  symbol: string;
  companyName: string;
  sector: string | null;
  currentPrice: number;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  peg: number | null;
  netMargin: number | null;
  roe: number | null;
  earningsGrowth: number | null;
  return1Y: number | null;
  dividendYield: number | null;
  week52Position: number;
  score: number;
  rating: string;
  ratingColor: string;
  targetPrice: number;
  upside: number;
  totalReturnPotential: number;
}

const SECTORS = [
  "Energy", "Materials", "Capital Goods", "Commercial & Professional Svc", "Transportation",
  "Consumer Durables & Apparel", "Consumer Services", "Media and Entertainment",
  "Consumer Discretionary Distribution & Retail", "Consumer Staples Distribution & Retail",
  "Food & Beverages", "Household & Personal Products", "Health Care Equipment & Svc",
  "Pharma, Biotech & Life Science", "Banks", "Financial Services", "Insurance",
  "Software & Services", "Telecommunication Services", "Utilities", "REITs", "Real Estate Mgmt & Dev't",
];

const RATING_FILTERS = [
  { key: "all", label: "All Ratings" },
  { key: "Strong Buy", label: "Strong Buy", color: "green" },
  { key: "Buy", label: "Buy", color: "green" },
  { key: "Accumulate", label: "Accumulate", color: "lime" },
  { key: "Hold", label: "Hold", color: "yellow" },
  { key: "Reduce", label: "Reduce", color: "orange" },
  { key: "Sell", label: "Sell", color: "red" },
];

function fmt(v: number | null, d = 2): string {
  if (v == null) return "-";
  return v.toFixed(d);
}

function RatingBadge({ rating, color }: { rating: string; color: string }) {
  const map: Record<string, string> = {
    green: "bg-green-500/15 text-green-400 border-green-500/30",
    lime: "bg-lime-500/15 text-lime-400 border-lime-500/30",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${map[color] || map.yellow}`}>
      {rating}
    </span>
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [data, setData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof Assessment>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/recommendations");
        if (res.ok) {
          const json = await res.json();
          setData(json.assessments || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const handleClick = useCallback((symbol: string) => {
    router.push(`/company?symbol=${symbol}`);
  }, [router]);

  function toggleSort(key: keyof Assessment) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  }

  // Filter
  let filtered = data;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a => a.symbol.toLowerCase().includes(q) || a.companyName.toLowerCase().includes(q));
  }
  if (sector) filtered = filtered.filter(a => a.sector === sector);
  if (ratingFilter !== "all") filtered = filtered.filter(a => a.rating === ratingFilter);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortBy], bv = b[sortBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Stats
  const counts = {
    strongBuy: data.filter(a => a.rating === "Strong Buy").length,
    buy: data.filter(a => a.rating === "Buy").length,
    accumulate: data.filter(a => a.rating === "Accumulate").length,
    hold: data.filter(a => a.rating === "Hold").length,
    reduce: data.filter(a => a.rating === "Reduce").length,
    sell: data.filter(a => a.rating === "Sell").length,
  };

  const SortHeader = ({ field, children, className }: { field: keyof Assessment; children: React.ReactNode; className?: string }) => (
    <th onClick={() => toggleSort(field)} className={`px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap ${className || "text-right"}`}>
      <div className={`flex items-center gap-1 ${className?.includes("text-left") ? "" : "justify-end"}`}>
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Recommendations</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Auto-generated stock assessments — sortable analysis for all listed companies
            </p>
          </div>
        </div>

        {/* Rating count cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="bg-card rounded-lg border border-green-500/30 p-3 text-center">
            <div className="text-[10px] text-green-400 uppercase font-semibold">Strong Buy</div>
            <div className="text-lg font-bold text-green-400">{counts.strongBuy}</div>
          </div>
          <div className="bg-card rounded-lg border border-green-500/30 p-3 text-center">
            <div className="text-[10px] text-green-400 uppercase font-semibold">Buy</div>
            <div className="text-lg font-bold text-green-400">{counts.buy}</div>
          </div>
          <div className="bg-card rounded-lg border border-lime-500/30 p-3 text-center">
            <div className="text-[10px] text-lime-400 uppercase font-semibold">Accumulate</div>
            <div className="text-lg font-bold text-lime-400">{counts.accumulate}</div>
          </div>
          <div className="bg-card rounded-lg border border-yellow-500/30 p-3 text-center">
            <div className="text-[10px] text-yellow-400 uppercase font-semibold">Hold</div>
            <div className="text-lg font-bold text-yellow-400">{counts.hold}</div>
          </div>
          <div className="bg-card rounded-lg border border-orange-500/30 p-3 text-center">
            <div className="text-[10px] text-orange-400 uppercase font-semibold">Reduce</div>
            <div className="text-lg font-bold text-orange-400">{counts.reduce}</div>
          </div>
          <div className="bg-card rounded-lg border border-red-500/30 p-3 text-center">
            <div className="text-[10px] text-red-400 uppercase font-semibold">Sell</div>
            <div className="text-lg font-bold text-red-400">{counts.sell}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              <Search className="inline h-3 w-3 mr-1" />Search
            </label>
            <input
              type="text"
              placeholder="Symbol or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              <Filter className="inline h-3 w-3 mr-1" />Sector
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[180px]"
            >
              <option value="">All Sectors</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {RATING_FILTERS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div className="ml-auto text-xs text-muted-foreground self-center">
            {sorted.length} of {data.length} stocks
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Computing recommendations for 269 stocks...</div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No stocks match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent/30 sticky top-0">
                  <tr>
                    <SortHeader field="symbol" className="text-left">Symbol</SortHeader>
                    <SortHeader field="companyName" className="text-left">Company</SortHeader>
                    <SortHeader field="sector" className="text-left">Sector</SortHeader>
                    <SortHeader field="rating" className="text-left">Rating</SortHeader>
                    <SortHeader field="score">Score</SortHeader>
                    <SortHeader field="currentPrice">Price</SortHeader>
                    <SortHeader field="targetPrice">Target</SortHeader>
                    <SortHeader field="upside">Upside</SortHeader>
                    <SortHeader field="totalReturnPotential">Total Ret</SortHeader>
                    <SortHeader field="pe">P/E</SortHeader>
                    <SortHeader field="pb">P/B</SortHeader>
                    <SortHeader field="peg">PEG</SortHeader>
                    <SortHeader field="roe">ROE %</SortHeader>
                    <SortHeader field="netMargin">Margin %</SortHeader>
                    <SortHeader field="earningsGrowth">EPS Grw %</SortHeader>
                    <SortHeader field="return1Y">1Y Ret %</SortHeader>
                    <SortHeader field="dividendYield">Div Yld %</SortHeader>
                    <SortHeader field="week52Position">52W Pos %</SortHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((a) => (
                    <tr
                      key={a.symbol}
                      onClick={() => handleClick(a.symbol)}
                      className="hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2 text-xs font-bold text-primary">{a.symbol}</td>
                      <td className="px-3 py-2 text-xs text-foreground max-w-[200px] truncate">{a.companyName}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{a.sector || "-"}</td>
                      <td className="px-3 py-2"><RatingBadge rating={a.rating} color={a.ratingColor} /></td>
                      <td className="px-3 py-2 text-xs text-right font-medium">{a.score}</td>
                      <td className="px-3 py-2 text-xs text-right">{fmt(a.currentPrice)}</td>
                      <td className="px-3 py-2 text-xs text-right">{fmt(a.targetPrice)}</td>
                      <td className={`px-3 py-2 text-xs text-right font-medium ${a.upside > 0 ? "text-green-400" : a.upside < 0 ? "text-red-400" : ""}`}>
                        {a.upside > 0 ? "+" : ""}{fmt(a.upside, 1)}%
                      </td>
                      <td className={`px-3 py-2 text-xs text-right font-medium ${a.totalReturnPotential > 0 ? "text-green-400" : "text-red-400"}`}>
                        {a.totalReturnPotential > 0 ? "+" : ""}{fmt(a.totalReturnPotential, 1)}%
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.pe, 1)}</td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.pb)}</td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.peg)}</td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.roe, 1)}</td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.netMargin, 1)}</td>
                      <td className={`px-3 py-2 text-xs text-right ${(a.earningsGrowth ?? 0) > 0 ? "text-green-400" : (a.earningsGrowth ?? 0) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {a.earningsGrowth != null ? (a.earningsGrowth > 0 ? "+" : "") + fmt(a.earningsGrowth, 1) : "-"}
                      </td>
                      <td className={`px-3 py-2 text-xs text-right ${(a.return1Y ?? 0) > 0 ? "text-green-400" : (a.return1Y ?? 0) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {a.return1Y != null ? (a.return1Y > 0 ? "+" : "") + fmt(a.return1Y, 1) : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.dividendYield, 1)}</td>
                      <td className="px-3 py-2 text-xs text-right text-muted-foreground">{fmt(a.week52Position, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground text-center italic">
          Click any stock to open its full assessment in the Company page. This is auto-generated from public data and is for informational purposes only. Not investment advice.
        </div>
      </main>
    </div>
  );
}
