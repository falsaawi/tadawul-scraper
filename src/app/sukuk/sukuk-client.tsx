"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Landmark,
  RefreshCw,
  Search,
  Sparkles,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

interface Metrics {
  code: string;
  name: string | null;
  isGovernment: boolean;
  couponType: string | null;
  couponRate: number | null;
  maturityDate: string | null;
  yearsToMaturity: number | null;
  price: number | null;
  premiumDiscount: number | null;
  currentYield: number | null;
  ytmApprox: number | null;
  marketYield: number | null;
  bidAskSpreadBps: number | null;
  avgVolume30: number | null;
  tradingDaysLast30: number;
  liquidity: string;
  yieldChange30dBps: number | null;
  spreadVsGovtBps: number | null;
  yieldPercentile: number | null;
  analysis: { rating: string | null; score: number | null; createdAt: string } | null;
}

interface InstrumentAnalysis {
  rating: string;
  score: number | null;
  strategy: string;
  summary: string;
  rationale: string[];
  risks: string[];
  disclaimer: string;
}

interface Commentary {
  commentary: string;
  themes: string[];
  opportunities: Array<{ code: string; name: string | null; rating: string; note: string }>;
  disclaimer: string;
}

const NUM = new Intl.NumberFormat("en-US");
const fmt = (n: number | null | undefined, dp = 2) =>
  n === null || n === undefined ? "—" : n.toFixed(dp);

function ratingClass(r: string | null | undefined): string {
  switch ((r || "").toLowerCase()) {
    case "attractive":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "fair":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "rich":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "avoid":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function liqClass(l: string): string {
  switch (l) {
    case "liquid":
      return "text-green-400";
    case "thin":
      return "text-amber-400";
    case "illiquid":
      return "text-orange-400";
    default:
      return "text-muted-foreground";
  }
}

type SortKey =
  | "code"
  | "name"
  | "couponRate"
  | "marketYield"
  | "yearsToMaturity"
  | "price"
  | "spreadVsGovtBps"
  | "yieldPercentile"
  | "yieldChange30dBps";

export function SukukClient() {
  const [rows, setRows] = useState<Metrics[]>([]);
  const [summary, setSummary] = useState<Record<string, number | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<"all" | "gov" | "corp">("all");
  const [sortKey, setSortKey] = useState<SortKey>("marketYield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [commentaryAt, setCommentaryAt] = useState<string | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  const [selected, setSelected] = useState<Metrics | null>(null);
  const [analysis, setAnalysis] = useState<InstrumentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sukuk");
      const j = await r.json();
      setRows(j.instruments || []);
      setSummary(j.summary || null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommentary = useCallback(async () => {
    const r = await fetch("/api/sukuk/commentary");
    const j = await r.json();
    if (j.analysis) {
      setCommentary(j.analysis);
      setCommentaryAt(j.createdAt);
    }
  }, []);

  useEffect(() => {
    loadList();
    loadCommentary();
  }, [loadList, loadCommentary]);

  async function refreshCommentary() {
    setCommentaryLoading(true);
    try {
      const r = await fetch("/api/sukuk/commentary", { method: "POST" });
      const j = await r.json();
      if (j.analysis) {
        setCommentary(j.analysis);
        setCommentaryAt(j.createdAt);
      } else if (j.error) {
        alert(j.error);
      }
    } finally {
      setCommentaryLoading(false);
    }
  }

  async function analyze(m: Metrics) {
    setSelected(m);
    setAnalysis(null);
    setAnalyzeErr(null);
    setAnalyzing(true);
    try {
      // Try the freshest cached analysis first, then generate.
      const cached = await fetch(`/api/sukuk/analyze?code=${m.code}`);
      const cj = await cached.json();
      if (cj.analysis) {
        setAnalysis(cj.analysis);
      } else {
        const r = await fetch("/api/sukuk/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: m.code }),
        });
        const j = await r.json();
        if (j.error) setAnalyzeErr(j.error);
        else setAnalysis(j.analysis);
      }
    } catch (e) {
      setAnalyzeErr(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function regenerate(code: string) {
    setAnalyzing(true);
    setAnalyzeErr(null);
    try {
      const r = await fetch("/api/sukuk/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (j.error) setAnalyzeErr(j.error);
      else setAnalysis(j.analysis);
    } finally {
      setAnalyzing(false);
    }
  }

  const filtered = useMemo(() => {
    let list = rows;
    if (seg === "gov") list = list.filter((r) => r.isGovernment);
    if (seg === "corp") list = list.filter((r) => !r.isGovernment);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.code.toLowerCase().includes(s) ||
          (r.name || "").toLowerCase().includes(s)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" && typeof bv === "string")
        return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, seg, q, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th
      className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground ${
        right ? "text-right" : "text-left"
      }`}
      onClick={() => toggleSort(k)}
    >
      <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
        {label} <SortIcon k={k} />
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Sukuk &amp; Bonds</h1>
        </div>
        <button
          onClick={loadList}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Instruments", v: summary.total },
            { label: "Government", v: summary.government },
            { label: "Corporate", v: summary.corporate },
            { label: "Liquid", v: summary.liquid },
            {
              label: "Avg yield",
              v: summary.avgYield != null ? `${summary.avgYield.toFixed(2)}%` : "—",
            },
            { label: "Analyzed", v: summary.analyzed },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
              <div className="text-lg font-semibold text-foreground">
                {typeof c.v === "number" ? NUM.format(c.v) : c.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market commentary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Market Commentary</h2>
            {commentaryAt && (
              <span className="text-[11px] text-muted-foreground">
                {new Date(commentaryAt).toLocaleString("en-GB")}
              </span>
            )}
          </div>
          <button
            onClick={refreshCommentary}
            disabled={commentaryLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-accent border border-border disabled:opacity-50"
          >
            {commentaryLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {commentaryLoading ? "Analyzing…" : "Generate"}
          </button>
        </div>
        {commentary ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {commentary.commentary}
            </p>
            {commentary.themes?.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {commentary.themes.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            {commentary.opportunities?.length > 0 && (
              <div className="mt-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Opportunities
                </div>
                <div className="space-y-1.5">
                  {commentary.opportunities.map((o, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm border-b border-border/50 pb-1.5"
                    >
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${ratingClass(
                          o.rating
                        )}`}
                      >
                        {o.rating}
                      </span>
                      <span className="font-mono text-foreground shrink-0">{o.code}</span>
                      <span className="text-muted-foreground">{o.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/70 italic pt-1">
              {commentary.disclaimer}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No commentary yet. Click <span className="text-primary">Generate</span> to produce a
            market-wide analysis (runs automatically each trading day).
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code or name…"
            className="pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-sm text-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["all", "gov", "corp"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeg(s)}
              className={`px-3 py-1.5 font-medium ${
                seg === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {s === "all" ? "All" : s === "gov" ? "Government" : "Corporate"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b border-border text-xs">
            <tr>
              <Th k="code" label="Code" />
              <Th k="name" label="Name" />
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <Th k="couponRate" label="Coupon%" right />
              <Th k="marketYield" label="YTM%" right />
              <Th k="yearsToMaturity" label="Yrs" right />
              <Th k="price" label="Price" right />
              <Th k="spreadVsGovtBps" label="Govt spr (bps)" right />
              <Th k="yieldPercentile" label="Pctile" right />
              <Th k="yieldChange30dBps" label="30d Δ (bps)" right />
              <th className="px-3 py-2 text-left font-medium">Liq</th>
              <th className="px-3 py-2 text-left font-medium">Rating</th>
              <th className="px-3 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">
                  No instruments.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.code}
                  className="border-b border-border/50 hover:bg-accent/50 cursor-pointer"
                  onClick={() => analyze(m)}
                >
                  <td className="px-3 py-2 font-mono text-foreground">{m.code}</td>
                  <td className="px-3 py-2 text-foreground max-w-[220px] truncate" title={m.name || ""}>
                    {m.name || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{m.couponType || "—"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt(m.couponRate)}</td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">
                    {fmt(m.marketYield)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {fmt(m.yearsToMaturity, 1)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt(m.price)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {m.spreadVsGovtBps === null ? "—" : Math.round(m.spreadVsGovtBps)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {m.yieldPercentile ?? "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      (m.yieldChange30dBps ?? 0) > 0
                        ? "text-red-400"
                        : (m.yieldChange30dBps ?? 0) < 0
                        ? "text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {m.yieldChange30dBps === null ? "—" : Math.round(m.yieldChange30dBps)}
                  </td>
                  <td className={`px-3 py-2 capitalize ${liqClass(m.liquidity)}`}>{m.liquidity}</td>
                  <td className="px-3 py-2">
                    {m.analysis?.rating ? (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${ratingClass(
                          m.analysis.rating
                        )}`}
                      >
                        {m.analysis.rating}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        analyze(m);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-primary hover:bg-accent border border-border"
                    >
                      <Sparkles className="h-3 w-3" /> Analyze
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Analysis modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-2xl w-full my-8 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{selected.code}</span>
                  <h3 className="font-semibold text-foreground">{selected.name}</h3>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selected.couponType} · {fmt(selected.couponRate)}% coupon · {fmt(selected.yearsToMaturity, 1)}y ·
                  YTM {fmt(selected.marketYield)}% · price {fmt(selected.price)} ·{" "}
                  <span className={liqClass(selected.liquidity)}>{selected.liquidity}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {analyzing ? (
              <div className="py-10 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Analyzing with Claude Opus 5…
              </div>
            ) : analyzeErr ? (
              <div className="py-6 text-center">
                <p className="text-sm text-red-400 mb-3">{analyzeErr}</p>
                <button
                  onClick={() => regenerate(selected.code)}
                  className="px-3 py-1.5 rounded-md text-sm text-primary border border-border hover:bg-accent"
                >
                  Retry
                </button>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold border ${ratingClass(
                      analysis.rating
                    )}`}
                  >
                    {analysis.rating}
                  </span>
                  {analysis.score != null && (
                    <span className="text-sm text-muted-foreground">
                      Score <span className="text-foreground font-semibold">{analysis.score}</span>/100
                    </span>
                  )}
                  <span className="text-sm text-foreground font-medium">{analysis.strategy}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                {analysis.rationale?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-green-400" /> Rationale
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      {analysis.rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.risks?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Risks
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      {analysis.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-muted-foreground/70 italic max-w-md">
                    {analysis.disclaimer}
                  </p>
                  <button
                    onClick={() => regenerate(selected.code)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-primary border border-border hover:bg-accent"
                  >
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
