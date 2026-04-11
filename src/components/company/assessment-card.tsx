"use client";

import { useEffect, useState } from "react";
import { Target, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, DollarSign, BarChart3, Award, Percent } from "lucide-react";

interface AssessmentData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  valuation: { pe: number | null; pb: number | null; eps: number | null; bookValuePerShare: number | null; peg: number | null; week52High: number; week52Low: number; week52Position: number };
  profitability: { revenue: number | null; netProfit: number | null; netMargin: number | null; roe: number | null; roa: number | null; unit: string };
  growth: { growthYears: Array<{ period: string; revenue: number | null; netProfit: number | null; eps: number | null }>; earningsGrowth: number | null };
  dividends: { recentDividends: Array<{ date: string | null; amount: string | null }>; estimatedAnnualDiv: number; dividendYield: number | null };
  pricePerformance: { return1Y: number | null; return3Y: number | null; priceNow: number; price1YAgo: number | null; price3YAgo: number | null };
  rating: { score: number; rating: string; ratingColor: string; signals: string[] };
  target: { targetPrice: number; upside: number; totalReturnPotential: number };
  risks: string[];
}

function fmt(v: number | null | undefined, d = 2): string {
  if (v == null) return "-";
  return v.toFixed(d);
}

function fmtB(v: number | null, unit: string): string {
  if (v == null) return "-";
  if (unit === "Thousands") {
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "B";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + "M";
    return v.toFixed(0) + "K";
  }
  return v.toLocaleString();
}

function RatingBadge({ rating, color }: { rating: string; color: string }) {
  const bgMap: Record<string, string> = {
    green: "bg-green-500/15 text-green-400 border-green-500/30",
    lime: "bg-lime-500/15 text-lime-400 border-lime-500/30",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-4 py-2 rounded-lg text-lg font-bold border ${bgMap[color] || bgMap.yellow}`}>
      {rating}
    </span>
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-xs font-medium text-foreground">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export function AssessmentCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssessment() {
      setLoading(true);
      try {
        const res = await fetch(`/api/company/assessment?symbol=${symbol}`);
        if (res.ok) setData(await res.json());
        else setData(null);
      } catch { setData(null); }
      finally { setLoading(false); }
    }
    fetchAssessment();
  }, [symbol]);

  if (loading) return <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground animate-pulse">Generating assessment...</div>;
  if (!data) return null;

  const isPositive = (data.target.upside || 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-400" />
        <h2 className="text-sm font-semibold text-foreground">Stock Assessment</h2>
      </div>

      {/* Rating + Target */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Rating</div>
          <RatingBadge rating={data.rating.rating} color={data.rating.ratingColor} />
          <div className="text-[10px] text-muted-foreground mt-2">Score: {data.rating.score}/10</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Target Price</div>
          <div className="text-2xl font-bold text-foreground">SAR {data.target.targetPrice.toFixed(2)}</div>
          <div className={`text-sm font-medium mt-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{data.target.upside.toFixed(1)}% upside
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            from SAR {data.currentPrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Return Potential</div>
          <div className={`text-2xl font-bold ${data.target.totalReturnPotential > 0 ? "text-green-400" : "text-red-400"}`}>
            {data.target.totalReturnPotential > 0 ? "+" : ""}{data.target.totalReturnPotential.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Price {isPositive ? "+" : ""}{data.target.upside.toFixed(1)}% + Div {fmt(data.dividends.dividendYield, 1)}%
          </div>
        </div>
      </div>

      {/* Valuation + Profitability + Growth + Dividends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valuation */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Target className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-foreground">Valuation</span>
          </div>
          <div className="space-y-0.5">
            <MetricRow label="P/E Ratio" value={fmt(data.valuation.pe, 1) + "x"} />
            <MetricRow label="P/B Ratio" value={fmt(data.valuation.pb, 2) + "x"} />
            <MetricRow label="EPS" value={"SAR " + fmt(data.valuation.eps)} />
            <MetricRow label="PEG Ratio" value={data.valuation.peg ? fmt(data.valuation.peg, 2) : "-"} />
            <MetricRow label="Book Value/Share" value={"SAR " + fmt(data.valuation.bookValuePerShare, 1)} />
          </div>
        </div>

        {/* Profitability */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <DollarSign className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-semibold text-foreground">Profitability</span>
          </div>
          <div className="space-y-0.5">
            <MetricRow label="Revenue" value={fmtB(data.profitability.revenue, data.profitability.unit)} sub="SAR" />
            <MetricRow label="Net Profit" value={fmtB(data.profitability.netProfit, data.profitability.unit)} sub="SAR" />
            <MetricRow label="Net Margin" value={fmt(data.profitability.netMargin, 1) + "%"} />
            <MetricRow label="ROE" value={fmt(data.profitability.roe, 1) + "%"} />
            <MetricRow label="ROA" value={fmt(data.profitability.roa, 2) + "%"} />
          </div>
        </div>

        {/* Growth */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-foreground">Growth & Returns</span>
          </div>
          <div className="space-y-0.5">
            <MetricRow label="Earnings Growth" value={(data.growth.earningsGrowth != null ? (data.growth.earningsGrowth > 0 ? "+" : "") + fmt(data.growth.earningsGrowth, 1) + "%" : "-")} />
            <MetricRow label="1Y Price Return" value={data.pricePerformance.return1Y != null ? (data.pricePerformance.return1Y > 0 ? "+" : "") + fmt(data.pricePerformance.return1Y, 1) + "%" : "-"} />
            <MetricRow label="3Y Price Return" value={data.pricePerformance.return3Y != null ? (data.pricePerformance.return3Y > 0 ? "+" : "") + fmt(data.pricePerformance.return3Y, 1) + "%" : "-"} />
            <MetricRow label="52W Position" value={fmt(data.valuation.week52Position, 0) + "%"} />
            <MetricRow label="52W Range" value={data.valuation.week52Low.toFixed(2) + " - " + data.valuation.week52High.toFixed(2)} />
          </div>
        </div>

        {/* Dividends */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Percent className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Dividends</span>
          </div>
          <div className="space-y-0.5">
            <MetricRow label="Dividend Yield" value={fmt(data.dividends.dividendYield, 1) + "%"} />
            <MetricRow label="Annual Dividend" value={"SAR " + data.dividends.estimatedAnnualDiv.toFixed(2)} />
            {data.dividends.recentDividends.slice(0, 4).map((d, i) => (
              <MetricRow key={i} label={d.date?.substring(0, 7) || "—"} value={"SAR " + (d.amount || "-")} />
            ))}
          </div>
        </div>
      </div>

      {/* Signals + Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-semibold text-foreground">Key Signals</span>
          </div>
          <ul className="space-y-1.5">
            {data.rating.signals.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Risk Factors</span>
          </div>
          <ul className="space-y-1.5">
            {data.risks.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <TrendingDown className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground text-center italic">
        This assessment is auto-generated from scraped public data and is for informational purposes only. Not investment advice.
      </div>
    </div>
  );
}
