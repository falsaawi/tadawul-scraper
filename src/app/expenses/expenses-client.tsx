"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Upload, RefreshCw, Calendar, CreditCard, Receipt,
  TrendingUp, Search, X, Building2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Cell,
} from "recharts";
import { ExpenseUploadForm } from "./expense-upload-form";

interface CatRow { category: string; value: number; count: number }
interface MerchRow { merchant: string; value: number; count: number; category: string }
interface ExpenseData {
  hasData: boolean;
  filters: { month: string | null; bank: string | null };
  availableMonths: string[];
  availableBanks: string[];
  statements: Array<{
    id: string; bank: string; cardName: string | null; cardNumber: string | null;
    statementMonth: string; statementLabel: string | null; totalDebits: number | null;
    totalCredits: number | null; parsedCount: number; dueDate: string | null;
    totalDue: number | null; minimumDue: number | null; uploadedAt: string; fileName: string;
  }>;
  summary: { spend: number; credits: number; transactionCount: number; statementCount: number; avgTransaction: number; monthsCovered: number };
  byCategory: CatRow[];
  topMerchants: MerchRow[];
  byBank: Array<{ bank: string; value: number; count: number }>;
  byCard: Array<{ key: string; cardNumber: string | null; value: number; count: number; bank: string; cardName: string | null }>;
  trend: Array<{ month: string; value: number; count: number }>;
  daily: Array<{ date: string; value: number }>;
  transactions: Array<{ id: string; txnDate: string | null; merchant: string; city: string | null; amount: number; currency: string | null; category: string; bank: string | null }>;
}

const SAR = new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", currencyDisplay: "code", maximumFractionDigits: 0 });
const SAR2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", currencyDisplay: "code", maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat("en-US");
const TT = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 };

// Fixed category -> color (identity, never cycled by rank).
const CATEGORY_COLOR: Record<string, string> = {
  "Groceries": "#22c55e",
  "Dining & Coffee": "#f59e0b",
  "Shopping": "#3b82f6",
  "Travel & Airlines": "#a855f7",
  "Transport & Fuel": "#06b6d4",
  "Bills & Telecom": "#ec4899",
  "Health & Pharmacy": "#14b8a6",
  "Entertainment": "#eab308",
  "Payments & Credits": "#64748b",
  "Other": "#94a3b8",
};
const catColor = (c: string) => CATEGORY_COLOR[c] ?? "#94a3b8";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const idx = parseInt(mo) - 1;
  return `${MONTHS[idx] ?? mo} ${y}`;
}
function fmtDate(d: string | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); } catch { return "—"; }
}

export function ExpensesClient() {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [month, setMonth] = useState("all");
  const [bank, setBank] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (month !== "all") p.set("month", month);
      if (bank !== "all") p.set("bank", bank);
      const qs = p.toString();
      const res = await fetch(`/api/expenses${qs ? "?" + qs : ""}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as ExpenseData);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, bank]);

  const filterActive = month !== "all" || bank !== "all";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground inline-flex items-center gap-2">
            My Expenses
            {filterActive && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {bank !== "all" ? bank : "All banks"}{month !== "all" ? ` · ${monthLabel(month)}` : ""}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Monthly credit card spending from uploaded statements (SAB · Al Rajhi)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data?.hasData && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-card">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={loading}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer">
                <option value="all">All months</option>
                {data.availableMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
              <select value={bank} onChange={(e) => setBank(e.target.value)} disabled={loading}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer border-l border-border pl-2">
                <option value="all">All banks</option>
                {data.availableBanks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {filterActive && (
                <button onClick={() => { setMonth("all"); setBank("all"); }} className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent ml-1">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Upload className="h-4 w-4" /> Upload statements
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground animate-pulse">Loading expenses…</div>
      )}

      {!loading && data && !data.hasData && <EmptyState onUpload={() => setShowUpload(true)} />}

      {data?.hasData && (
        <>
          <SummaryCards d={data} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <TrendPanel trend={data.trend} onPick={setMonth} />
            <CategoryPanel rows={data.byCategory} total={data.summary.spend} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <MerchantsPanel rows={data.topMerchants} />
            {month !== "all" ? <DailyPanel daily={data.daily} /> : <CardsPanel byCard={data.byCard} />}
          </div>
          <TransactionsTable rows={data.transactions} categories={data.byCategory.map((c) => c.category)} />
          <StatementsList statements={data.statements} />
        </>
      )}

      <ExpenseUploadForm open={showUpload} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load(); }} />
    </>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-base font-semibold">No statements uploaded yet</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
        Upload your monthly credit card statement PDFs (SAB or Al Rajhi) to see spending by
        category, top merchants, month-over-month trends, and per-card breakdowns.
      </p>
      <button onClick={onUpload} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        <Upload className="h-4 w-4" /> Upload statements
      </button>
    </div>
  );
}

function SummaryCards({ d }: { d: ExpenseData }) {
  const s = d.summary;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={<Wallet className="h-4 w-4 text-red-400" />} bg="bg-red-500/10" label="Total spend"
        value={SAR.format(s.spend)} sub={`${NUM.format(s.transactionCount)} transactions`} />
      <Card icon={<TrendingUp className="h-4 w-4 text-amber-400" />} bg="bg-amber-500/10" label="Avg transaction"
        value={SAR.format(s.avgTransaction)} sub={`${s.statementCount} statement(s)`} />
      <Card icon={<Calendar className="h-4 w-4 text-blue-400" />} bg="bg-blue-500/10" label="Months covered"
        value={String(s.monthsCovered)} sub={d.filters.month ? monthLabel(d.filters.month) : "all uploaded months"} />
      <Card icon={<Receipt className="h-4 w-4 text-emerald-400" />} bg="bg-emerald-500/10" label="Refunds / credits"
        value={SAR.format(s.credits)} sub="excluded from spend" />
    </div>
  );
}

function Card({ icon, bg, label, value, sub }: { icon: React.ReactNode; bg: string; label: string; value: string; sub?: string }) {
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

function Panel({ title, children, right }: { title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold">{title}</h3>{right}
      </div>
      <div className="p-3 flex-1 min-h-0">{children}</div>
    </div>
  );
}

function TrendPanel({ trend, onPick }: { trend: ExpenseData["trend"]; onPick: (m: string) => void }) {
  const data = trend.map((t) => ({ ...t, label: monthLabel(t.month) }));
  return (
    <Panel title="Monthly spend" right={<span className="text-[10px] text-muted-foreground">click a bar to filter</span>}>
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ left: 4, right: 12 }} onClick={(e) => { const p = (e as { activePayload?: Array<{ payload: { month: string } }> })?.activePayload?.[0]?.payload; if (p) onPick(p.month); }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => SAR2.format(Number(v))} contentStyle={TT} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function CategoryPanel({ rows, total }: { rows: CatRow[]; total: number }) {
  return (
    <Panel title="Spending by category">
      {rows.length === 0 ? <Empty /> : (
        <div className="space-y-2 py-1">
          {rows.map((r) => {
            const pct = total > 0 ? (r.value / total) * 100 : 0;
            return (
              <div key={r.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: catColor(r.category) }} />
                    <span className="truncate">{r.category}</span>
                    <span className="text-[10px] text-muted-foreground">×{r.count}</span>
                  </span>
                  <span className="font-mono font-medium shrink-0">{SAR.format(r.value)} <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span></span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: catColor(r.category) }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function MerchantsPanel({ rows }: { rows: MerchRow[] }) {
  const data = rows.slice(0, 12).map((r) => ({ ...r, short: r.merchant.length > 26 ? r.merchant.slice(0, 24) + "…" : r.merchant }));
  return (
    <Panel title="Top merchants">
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <YAxis dataKey="short" type="category" tick={{ fontSize: 10, fill: "#cbd5e1" }} width={150} />
            <Tooltip formatter={(v) => SAR2.format(Number(v))} contentStyle={TT} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => <Cell key={i} fill={catColor(d.category)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function DailyPanel({ daily }: { daily: ExpenseData["daily"] }) {
  const data = daily.map((d) => ({ ...d, label: fmtDate(d.date) }));
  return (
    <Panel title="Daily spend">
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ left: 4, right: 12 }}>
            <defs>
              <linearGradient id="expday" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} />
            <Tooltip formatter={(v) => SAR2.format(Number(v))} contentStyle={TT} />
            <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fill="url(#expday)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function CardsPanel({ byCard }: { byCard: ExpenseData["byCard"] }) {
  const total = byCard.reduce((s, c) => s + c.value, 0);
  return (
    <Panel title="Spend by card">
      {byCard.length === 0 ? <Empty /> : (
        <div className="grid grid-cols-1 gap-2">
          {byCard.map((c) => {
            const pct = total > 0 ? (c.value / total) * 100 : 0;
            return (
              <div key={c.key} className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.bank}{c.cardName ? ` · ${c.cardName}` : ""}{c.cardNumber ? ` ••${c.cardNumber}` : ""}
                  </span>
                  <span className="font-mono text-sm font-semibold">{SAR.format(c.value)}</span>
                </div>
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{c.count} transactions · {pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function TransactionsTable({ rows, categories }: { rows: ExpenseData["transactions"]; categories: string[] }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (cat === "all" || r.category === cat) &&
      (!q || r.merchant.toLowerCase().includes(q) || (r.city ?? "").toLowerCase().includes(q))
    );
  }, [rows, search, cat]);
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Transactions <span className="text-[10px] text-muted-foreground">({filtered.length})</span></h3>
        <div className="flex items-center gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-2 py-1 rounded-md border border-border bg-input text-foreground text-xs">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search merchant…"
              className="pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs w-52 bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Merchant</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-left font-medium">Bank</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t border-border/40 hover:bg-accent/50">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{fmtDate(t.txnDate)}</td>
                <td className="px-3 py-1.5 truncate max-w-[280px]">{t.merchant}{t.city ? <span className="text-muted-foreground"> · {t.city}</span> : ""}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: catColor(t.category) }} />
                    {t.category}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{t.bank ?? "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono font-medium">
                  {SAR2.format(t.amount)}{t.currency ? <span className="text-[9px] text-amber-400 ml-1">{t.currency}</span> : ""}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementsList({ statements }: { statements: ExpenseData["statements"] }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Uploaded statements <span className="text-[10px] text-muted-foreground">({statements.length})</span></h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Month</th>
              <th className="px-3 py-2 text-left font-medium">Bank / Card</th>
              <th className="px-3 py-2 text-right font-medium">Txns</th>
              <th className="px-3 py-2 text-right font-medium">Spend</th>
              <th className="px-3 py-2 text-right font-medium">Total due</th>
              <th className="px-3 py-2 text-left font-medium">Due date</th>
            </tr>
          </thead>
          <tbody>
            {statements.map((s) => (
              <tr key={s.id} className="border-t border-border/40 hover:bg-accent/50">
                <td className="px-3 py-1.5 font-medium">{s.statementMonth !== "unknown" ? monthLabel(s.statementMonth) : "—"}</td>
                <td className="px-3 py-1.5"><span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3 text-muted-foreground" />{s.bank}{s.cardNumber ? ` ••${s.cardNumber}` : ""}</span></td>
                <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{s.parsedCount}</td>
                <td className="px-3 py-1.5 text-right font-mono font-medium">{s.totalDebits != null ? SAR2.format(s.totalDebits) : "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono">{s.totalDue != null ? SAR2.format(s.totalDue) : "—"}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{s.dueDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">No data</div>;
}
