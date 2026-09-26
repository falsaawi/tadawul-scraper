"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Zap,
} from "lucide-react";

interface StockAnalysis {
  rating: string;
  score: number | null;
  recommendation: string;
  valuation: string;
  summary: string;
  strengths: string[];
  risks: string[];
  catalysts: string[];
  disclaimer: string;
}

function ratingClass(r: string | null | undefined): string {
  switch ((r || "").toLowerCase()) {
    case "strong buy":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "buy":
      return "bg-lime-500/15 text-lime-400 border-lime-500/30";
    case "hold":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "reduce":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "sell":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function StockAgentCard({ symbol }: { symbol: string }) {
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadCached = useCallback(async () => {
    setAnalysis(null);
    setCreatedAt(null);
    setErr(null);
    try {
      const r = await fetch(`/api/company/analyze?symbol=${symbol}`);
      const j = await r.json();
      if (j.analysis) {
        setAnalysis(j.analysis);
        setCreatedAt(j.createdAt);
        setModel(j.model);
      }
    } catch {
      /* ignore */
    }
  }, [symbol]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  async function generate() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/company/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const j = await r.json();
      if (j.error) setErr(j.error);
      else {
        setAnalysis(j.analysis);
        setCreatedAt(j.createdAt);
        setModel(j.model);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">AI Financial Analysis</h2>
          {model && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {model}
            </span>
          )}
          {createdAt && (
            <span className="text-[11px] text-muted-foreground">
              {new Date(createdAt).toLocaleString("en-GB")}
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-accent border border-border disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : analysis ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? "Analyzing…" : analysis ? "Regenerate" : "Analyze with AI"}
        </button>
      </div>

      {loading && !analysis && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Analyzing {symbol} with Claude
          Opus 5…
        </div>
      )}

      {err && (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2">{err}</div>
      )}

      {!analysis && !loading && !err && (
        <p className="text-sm text-muted-foreground">
          Get a full fundamental analysis and recommendation for {symbol} — valuation, growth,
          profitability, strengths, risks, and catalysts.
        </p>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded text-sm font-semibold border ${ratingClass(
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
            <span className="text-sm text-foreground font-medium">
              {analysis.recommendation}
            </span>
          </div>

          {analysis.valuation && (
            <div className="text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">
                Valuation
              </span>
              <span className="text-foreground">{analysis.valuation}</span>
            </div>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.strengths?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-400" /> Strengths
                </div>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  {analysis.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.risks?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Risks
                </div>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  {analysis.risks.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.catalysts?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                  <Zap className="h-3.5 w-3.5 text-sky-400" /> Catalysts
                </div>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  {analysis.catalysts.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/70 italic pt-1">
            {analysis.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
