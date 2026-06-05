"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  Upload,
  RefreshCw,
  Calendar,
  TrendingUp,
  Building2,
  Link2,
  Link2Off,
  Search,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { DividendUploadForm } from "../portfolio/dividend-upload-form";

interface Company {
  company: string;
  symbol: string | null;
  companyName: string | null;
  value: number;
  count: number;
  cost: number | null;
  yieldOnCostPct: number | null;
}

interface DividendData {
  upload: { id: string; fileName: string; uploadedAt: string; rowCount: number } | null;
  filters: { year: number | null; month: number | null };
  availableYears: number[];
  summary: {
    lifetime: number;
    yearToDate: number;
    lastYear: number;
    last30Days: number;
    last12Months: number;
    count: number;
    distinctCompanies: number;
    matched: number;
    unmatched: number;
    coverage: number;
    matchedCompanies: number;
    unmatchedCompanies: number;
    avgPerYear: number;
    firstDate: string | null;
    lastDate: string | null;
    yearsSpan: number;
  };
  byYear: Array<{ year: number; value: number; count: number }>;
  cumulative: Array<{ year: number; cumulative: number; value: number }>;
  byMonth: Array<{ month: number; label: string; value: number; count: number }>;
  byStatus: Array<{ status: string; value: number; count: number }>;
  byType: Array<{ type: string; value: number; count: number }>;
  companies: Company[];
  topYielders: Company[];
  recent: Array<{
    id: string;
    company: string;
    symbol: string | null;
    value: number;
    perShare: number | null;
    units: number | null;
    distDate: string | null;
    status: string | null;
    type: string | null;
  }>;
}

const SAR = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SAR",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});
const SAR2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SAR",
  currencyDisplay: "code",
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("en-US");
const PCT = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const TT = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 12,
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DividendClient() {
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year !== "all") params.set("year", year);
      if (month !== "all") params.set("month", month);
      const qs = params.toString();
      const res = await fetch(`/api/investment/dividends${qs ? "?" + qs : ""}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as DividendData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const filterActive = year !== "all" || month !== "all";
  const yearLabel = year === "all" ? "All years" : year;
  const monthLabel = month === "all" ? "All months" : MONTH_NAMES[parseInt(month) - 1];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground inline-flex items-center gap-2">
            My Dividend
            {filterActive && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {monthLabel} · {yearLabel}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Historical dividend income, linked to Tadawul stock codes
            {data?.upload && (
              <>
                {" · "}
                <span className="text-foreground">{data.upload.fileName}</span> ·{" "}
                {data.upload.rowCount.toLocaleString()} records
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-card">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={loading}
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All years</option>
              {data?.availableYears?.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={loading}
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer border-l border-border pl-2"
            >
              <option value="all">All months</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            {filterActive && (
              <button
                onClick={() => { setYear("all"); setMonth("all"); }}
                disabled={loading}
                title="Clear filters"
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Upload dividend report
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground animate-pulse">
          Loading dividends…
        </div>
      )}

      {!loading && !data?.upload && <EmptyState onUpload={() => setShowUpload(true)} />}

      {data?.upload && (
        <>
          <SummaryCards d={data} />
          <ChartsRow d={data} />
          <SeasonalityRow d={data} />
          <MappingTable companies={data.companies} summary={data.summary} onUpdated={load} />
        </>
      )}

      <DividendUploadForm
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => {
          setShowUpload(false);
          load();
        }}
      />
    </>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <Coins className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-base font-semibold">No dividend report yet</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
        Upload your broker&apos;s historical dividend report (InvestorDividends.xlsx)
        to see lifetime income, per-year trends, seasonality, yield on cost, and a
        company-to-symbol mapping.
      </p>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        <Upload className="h-4 w-4" />
        Upload dividend report
      </button>
    </div>
  );
}

function SummaryCards({ d }: { d: DividendData }) {
  const s = d.summary;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={<Coins className="h-4 w-4 text-emerald-400" />} bg="bg-emerald-500/10"
        label="Lifetime received" value={SAR.format(s.lifetime)}
        sub={s.firstDate ? `since ${fmtDate(s.firstDate)} · ${s.yearsSpan}y` : undefined} />
      <Card icon={<Calendar className="h-4 w-4 text-green-400" />} bg="bg-green-500/10"
        label="Year to date" value={SAR.format(s.yearToDate)}
        sub={`Last 12 mo ${SAR.format(s.last12Months)}`} />
      <Card icon={<TrendingUp className="h-4 w-4 text-blue-400" />} bg="bg-blue-500/10"
        label="Average / year" value={SAR.format(s.avgPerYear)}
        sub={`Last cal year ${SAR.format(s.lastYear)}`} />
      <Card icon={<Building2 className="h-4 w-4 text-purple-400" />} bg="bg-purple-500/10"
        label="Payments / companies" value={`${NUM.format(s.count)} / ${NUM.format(s.distinctCompanies)}`}
        sub={`${Math.round(s.coverage)}% linked to symbols`} />
    </div>
  );
}

function Card({ icon, bg, label, value, sub }: {
  icon: React.ReactNode; bg: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
      <div className={`${bg} p-2.5 rounded-lg shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground truncate">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function Panel({ title, children, right }: {
  title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function ChartsRow({ d }: { d: DividendData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Panel title="Dividends per year">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={d.byYear} margin={{ left: 4, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => SAR.format(Number(v))} contentStyle={TT} />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Cumulative dividends">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={d.cumulative} margin={{ left: 4, right: 12 }}>
            <defs>
              <linearGradient id="divcum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => SAR.format(Number(v))} contentStyle={TT} />
            <Area type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2} fill="url(#divcum)" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function SeasonalityRow({ d }: { d: DividendData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Panel title="Seasonality — which months pay most (all years)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={d.byMonth} margin={{ left: 4, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => SAR.format(Number(v))} contentStyle={TT} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Payments count per year">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={d.byYear} margin={{ left: 4, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function MappingTable({
  companies,
  summary,
  onUpdated,
}: {
  companies: Company[];
  summary: DividendData["summary"];
  onUpdated: () => void;
}) {
  const [search, setSearch] = useState("");
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(company: string, symbol: string | null) {
    setEditing(company);
    setEditVal(symbol ?? "");
    setError(null);
  }
  function cancel() {
    setEditing(null);
    setEditVal("");
    setError(null);
  }
  async function save(company: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/investment/dividends/mapping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company, symbol: editVal.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      cancel();
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (onlyUnmatched && c.symbol) return false;
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        (c.symbol ?? "").toLowerCase().includes(q) ||
        (c.companyName ?? "").toLowerCase().includes(q)
      );
    });
  }, [companies, search, onlyUnmatched]);

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Company → symbol mapping
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <Link2 className="h-2.5 w-2.5" /> {summary.matchedCompanies} linked
          </span>
          {summary.unmatchedCompanies > 0 && (
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 inline-flex items-center gap-1">
              <Link2Off className="h-2.5 w-2.5" /> {summary.unmatchedCompanies} unlinked
            </span>
          )}
        </span>
      }
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyUnmatched((v) => !v)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              onlyUnmatched
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Unlinked only
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-7 pr-2 py-1 border border-border rounded-md text-xs w-44 bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
          {error}
        </div>
      )}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground sticky top-0 bg-card">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Broker name</th>
              <th className="px-2 py-1.5 text-left font-medium">Symbol</th>
              <th className="px-2 py-1.5 text-left font-medium">Tadawul name</th>
              <th className="px-2 py-1.5 text-right font-medium">Payments</th>
              <th className="px-2 py-1.5 text-right font-medium">Total</th>
              <th className="px-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const isEditing = editing === c.company;
              return (
                <tr key={c.company} className="border-t border-border/40 hover:bg-accent/50">
                  <td className="px-2 py-1.5 truncate max-w-[220px]">{c.company}</td>
                  <td className="px-2 py-1.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editVal}
                        autoFocus
                        disabled={saving}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") save(c.company);
                          if (e.key === "Escape") cancel();
                        }}
                        placeholder="e.g. 1120"
                        className="w-24 px-1.5 py-0.5 font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    ) : c.symbol ? (
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-400">
                        <Link2 className="h-3 w-3" />{c.symbol}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-400/80">
                        <Link2Off className="h-3 w-3" />unlinked
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 truncate max-w-[200px] text-muted-foreground">{c.companyName ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{c.count}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-medium">{SAR2.format(c.value)}</td>
                  <td className="px-2 py-1.5 text-right">
                    {isEditing ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          onClick={() => save(c.company)}
                          disabled={saving}
                          title="Save (Enter)"
                          className="p-1 rounded text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={cancel}
                          disabled={saving}
                          title="Cancel (Esc)"
                          className="p-1 rounded text-muted-foreground hover:bg-accent disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => startEdit(c.company, c.symbol)}
                        title="Edit symbol"
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">No companies match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

