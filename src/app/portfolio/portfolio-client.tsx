"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  ArrowUpDown,
  Globe,
  Briefcase,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Treemap,
} from "recharts";
import { UploadForm } from "./upload-form";

type Tab = "saudi-stocks" | "saudi-funds" | "usa" | "gulf" | "cash";

interface BrokerSlice {
  capitalFirm: string;
  qty: number;
  totalCost: number | null;
  brokerCurrentValue: number | null;
}

interface SaudiStock {
  stockCode: string;
  companyName: string | null;
  sector: string | null;
  qty: number;
  avgCost: number | null;
  totalCost: number | null;
  brokerMarketPrice: number | null;
  brokerCurrentValue: number | null;
  livePrice: number | null;
  liveValue: number | null;
  livePctChange: number | null;
  pnl: number | null;
  pnlPct: number | null;
  brokers: BrokerSlice[];
}

interface SaudiFund {
  fundName: string;
  qty: number;
  avgCostPerUnit: number | null;
  totalCost: number | null;
  closePrice: number | null;
  marketValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  brokers: Array<{
    capitalFirm: string;
    qty: number;
    totalCost: number | null;
    marketValue: number | null;
  }>;
}

interface UsaStock {
  ticker: string;
  qty: number;
  costValue: number | null;
  closePrice: number | null;
  marketValue: number | null;
  profitLoss: number | null;
}

interface GulfStock {
  capitalFirm: string | null;
  market: string;
  stockCode: string;
  qty: number;
  marketPrice: number | null;
  currentValue: number | null;
}

interface CashRow {
  capitalFirm: string;
  portfolio: string | null;
  amount: number;
}

type TreemapView = "root" | "saudi-stocks" | "saudi-funds" | "usa" | "gulf" | "cash";

interface TreemapNode {
  id: string;
  name: string;
  value: number;
  count?: number;
  meta?: Record<string, unknown>;
}

interface ApiResponse {
  upload: { id: string; fileName: string; uploadedAt: string } | null;
  liveSessionAt: string | null;
  totals: {
    grandTotal: number;
    grandCost: number;
    cash: number;
    saudiStocksLive: number;
    saudiStocksCost: number;
    saudiStocksPnl: number;
    saudiStocksPnlPct: number;
    saudiStocksUnmatched: number;
    saudiFundsValue: number;
    saudiFundsCost: number;
    saudiFundsPnl: number;
    usaValue: number;
    usaCost: number;
    usaPnl: number;
    gulfValue: number;
  };
  treemap: {
    root: TreemapNode[];
    details: Record<Exclude<TreemapView, "root">, TreemapNode[]>;
  };
  topHoldings: Array<{ name: string; category: string; value: number }>;
  brokerAllocation: Array<{ broker: string; value: number }>;
  topGainers: SaudiStock[];
  topLosers: SaudiStock[];
  saudiStocks: SaudiStock[];
  saudiFunds: SaudiFund[];
  usaStocks: UsaStock[];
  gulfStocks: GulfStock[];
  cash: CashRow[];
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

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4",
  "#ec4899", "#84cc16", "#f97316", "#6366f1", "#14b8a6",
  "#eab308", "#f43f5e", "#8b5cf6", "#0ea5e9", "#ef4444",
];

const CATEGORY_COLOR: Record<string, string> = {
  "Saudi Stocks": "#22c55e",
  "Saudi Funds": "#3b82f6",
  "USA Stocks": "#a855f7",
  "Gulf Stocks": "#f59e0b",
  Cash: "#94a3b8",
};

const VIEW_LABEL: Record<Exclude<TreemapView, "root">, string> = {
  "saudi-stocks": "Saudi Stocks",
  "saudi-funds": "Saudi Funds",
  usa: "USA Stocks",
  gulf: "Gulf Stocks",
  cash: "Cash",
};

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function PortfolioClient() {
  const [tab, setTab] = useState<Tab>("saudi-stocks");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/investment", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as ApiResponse);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Portfolio</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Personal investment workbook, Saudi positions valued against live Tadawul prices
            {data?.upload && (
              <>
                {" · "}
                <span className="text-foreground">
                  {data.upload.fileName}
                </span>{" "}
                uploaded {fmtDateTime(data.upload.uploadedAt)}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            Upload workbook
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground animate-pulse">
          Loading portfolio…
        </div>
      )}

      {!loading && !data?.upload && (
        <EmptyState onUpload={() => setShowUpload(true)} />
      )}

      {data?.upload && (
        <>
          <SummaryCards data={data} />
          <ChartsRow data={data} />
          <MoversRow data={data} />
          <TabBar
            tab={tab}
            setTab={setTab}
            counts={{
              "saudi-stocks": data.saudiStocks.length,
              "saudi-funds": data.saudiFunds.length,
              usa: data.usaStocks.length,
              gulf: data.gulfStocks.length,
              cash: data.cash.length,
            }}
          />
          {tab === "saudi-stocks" && <SaudiStocksTab rows={data.saudiStocks} unmatched={data.totals.saudiStocksUnmatched} />}
          {tab === "saudi-funds" && <SaudiFundsTab rows={data.saudiFunds} />}
          {tab === "usa" && <UsaStocksTab rows={data.usaStocks} />}
          {tab === "gulf" && <GulfStocksTab rows={data.gulfStocks} />}
          {tab === "cash" && <CashTab rows={data.cash} total={data.totals.cash} />}
        </>
      )}

      <UploadForm
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
      <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-base font-semibold">No portfolio uploaded yet</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
        Upload your investment workbook (the .xlsx with Saudi Stocks, Saudi
        Funds, USA Stock, Gulf Stocks, and Investment Cash sheets) to see live
        valuations, P/L, and allocation analytics.
      </p>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        <Upload className="h-4 w-4" />
        Upload workbook
      </button>
    </div>
  );
}

function SummaryCards({ data }: { data: ApiResponse }) {
  const t = data.totals;
  const totalCost = t.saudiStocksCost + t.saudiFundsCost + t.usaCost;
  const totalPnl = t.saudiStocksPnl + t.saudiFundsPnl + t.usaPnl;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const pnlPositive = totalPnl >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        icon={<Wallet className="h-4 w-4 text-blue-400" />}
        iconBg="bg-blue-500/10"
        label="Total portfolio"
        value={SAR.format(t.grandTotal)}
        sub={`Invested ${SAR.format(totalCost)} · Cash ${SAR.format(t.cash)}`}
      />
      <Card
        icon={
          pnlPositive ? (
            <TrendingUp className="h-4 w-4 text-green-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )
        }
        iconBg={pnlPositive ? "bg-green-500/10" : "bg-red-500/10"}
        label="Total P/L (invested)"
        value={`${pnlPositive ? "+" : ""}${SAR.format(totalPnl)}`}
        valueClass={pnlPositive ? "text-green-400" : "text-red-400"}
        sub={PCT(totalPnlPct)}
      />
      <Card
        icon={<Briefcase className="h-4 w-4 text-emerald-400" />}
        iconBg="bg-emerald-500/10"
        label="Saudi stocks (live)"
        value={SAR.format(t.saudiStocksLive)}
        sub={`P/L ${t.saudiStocksPnl >= 0 ? "+" : ""}${SAR.format(t.saudiStocksPnl)} (${PCT(t.saudiStocksPnlPct)})`}
        subClass={t.saudiStocksPnl >= 0 ? "text-green-400" : "text-red-400"}
      />
      <Card
        icon={<Globe className="h-4 w-4 text-purple-400" />}
        iconBg="bg-purple-500/10"
        label="Funds + USA + Gulf"
        value={SAR.format(t.saudiFundsValue + t.usaValue + t.gulfValue)}
        sub={`Funds ${SAR.format(t.saudiFundsValue)} · USA ${SAR.format(t.usaValue)} · Gulf ${SAR.format(t.gulfValue)}`}
      />
    </div>
  );
}

function ChartsRow({ data }: { data: ApiResponse }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <AllocationTreemap data={data} />
      <Panel title="Top 10 holdings (by value)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topHoldings} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#cbd5e1" }} width={140} />
            <Tooltip
              formatter={(v) => SAR.format(Number(v))}
              contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.topHoldings.map((h, i) => (
                <Cell key={i} fill={CATEGORY_COLOR[h.category] ?? COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function AllocationTreemap({ data }: { data: ApiResponse }) {
  const [view, setView] = useState<TreemapView>("root");

  const { nodes, total, breadcrumb } = useMemo(() => {
    const list =
      view === "root"
        ? data.treemap.root
        : data.treemap.details[view] ?? [];
    const filtered = list.filter((n) => n.value > 0);
    const sum = filtered.reduce((s, n) => s + n.value, 0);
    return {
      nodes: filtered,
      total: sum,
      breadcrumb:
        view === "root" ? "All assets" : `All assets · ${VIEW_LABEL[view]}`,
    };
  }, [data.treemap, view]);

  const treeData = nodes.map((n) => ({
    name: n.name,
    size: n.value,
    id: n.id,
    pct: total > 0 ? (n.value / total) * 100 : 0,
    rawCategory: view === "root" ? n.name : VIEW_LABEL[view as Exclude<TreemapView, "root">],
  }));

  function onClickNode(payload: TreemapPayload | undefined) {
    if (!payload || view !== "root") return;
    const id = payload.id as TreemapView | undefined;
    if (!id) return;
    if (data.treemap.details[id as Exclude<TreemapView, "root">]?.length) {
      setView(id);
    }
  }

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          {view !== "root" && (
            <button
              onClick={() => setView("root")}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Back to all assets"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <span>Asset allocation</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {breadcrumb}
          </span>
        </div>
      }
      right={
        view === "root" ? (
          <span className="text-[10px] text-muted-foreground">click a tile to drill in</span>
        ) : null
      }
    >
      {nodes.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-xs text-muted-foreground">
          Nothing to show
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={treeData}
            dataKey="size"
            stroke="#0f172a"
            isAnimationActive={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={<TreemapTile view={view} /> as any}
            onClick={(p) => onClickNode(p as TreemapPayload)}
          >
            <Tooltip
              content={<TreemapTooltip total={total} />}
            />
          </Treemap>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

interface TreemapPayload {
  id?: string;
  name?: string;
  size?: number;
  pct?: number;
  rawCategory?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  index?: number;
}

function TreemapTile(props: TreemapPayload & { view?: TreemapView }) {
  const { x = 0, y = 0, width = 0, height = 0, name, size, pct, view, index = 0 } = props;
  if (width <= 0 || height <= 0) return null;
  // Color by category for root, by index for detail
  const isRoot = view === "root";
  const fill = isRoot
    ? CATEGORY_COLOR[name ?? ""] ?? COLORS[index % COLORS.length]
    : COLORS[index % COLORS.length];

  const showLabel = width > 70 && height > 30;
  const showPct = width > 70 && height > 50;
  const showValue = width > 110 && height > 70;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill,
          fillOpacity: 0.85,
          stroke: "#0f172a",
          strokeWidth: 2,
          cursor: isRoot ? "pointer" : "default",
        }}
      />
      {showLabel && (
        <text
          x={x + 8}
          y={y + 18}
          fontSize={11}
          fontWeight={600}
          fill="#fff"
          style={{ pointerEvents: "none" }}
        >
          {truncate(name ?? "", Math.floor(width / 7))}
        </text>
      )}
      {showPct && (
        <text
          x={x + 8}
          y={y + 34}
          fontSize={10}
          fill="rgba(255,255,255,0.85)"
          style={{ pointerEvents: "none" }}
        >
          {pct != null ? `${pct.toFixed(1)}%` : ""}
        </text>
      )}
      {showValue && size != null && (
        <text
          x={x + 8}
          y={y + 50}
          fontSize={10}
          fill="rgba(255,255,255,0.7)"
          style={{ pointerEvents: "none" }}
        >
          {SAR.format(size)}
        </text>
      )}
    </g>
  );
}

function TreemapTooltip({ total, ...rest }: { total: number; active?: boolean; payload?: Array<{ payload: TreemapPayload }> }) {
  const payload = rest.payload?.[0]?.payload;
  if (!payload) return null;
  const pct = total > 0 ? (Number(payload.size ?? 0) / total) * 100 : 0;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-foreground">
      <div className="font-semibold">{payload.name}</div>
      <div className="text-muted-foreground mt-0.5">
        {SAR2.format(Number(payload.size ?? 0))} · {pct.toFixed(2)}% of {payload.rawCategory ?? "total"}
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (max <= 1) return "";
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}

function MoversRow({ data }: { data: ApiResponse }) {
  if (data.topGainers.length === 0 && data.topLosers.length === 0) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <MoversPanel title="Saudi holdings — today's top gainers" rows={data.topGainers} />
      <MoversPanel title="Saudi holdings — today's top losers" rows={data.topLosers} />
    </div>
  );
}

function MoversPanel({ title, rows }: { title: string; rows: SaudiStock[] }) {
  return (
    <Panel title={title}>
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-xs text-muted-foreground py-4 text-center">No live price data</div>
        )}
        {rows.map((r) => {
          const pct = r.livePctChange ?? 0;
          const color = pct >= 0 ? "text-green-400" : "text-red-400";
          return (
            <div key={r.stockCode} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-medium">{r.stockCode}</span>
                <span className="text-muted-foreground truncate">{r.companyName || "—"}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono">{r.livePrice?.toFixed(2)}</span>
                <span className={`font-mono font-medium ${color}`}>{PCT(pct)}</span>
                <span className="font-mono text-muted-foreground w-24 text-right">{SAR2.format(r.liveValue ?? 0)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Card({
  icon,
  iconBg,
  label,
  value,
  valueClass,
  sub,
  subClass,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
      <div className={`${iconBg} p-2.5 rounded-lg shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold truncate ${valueClass ?? "text-foreground"}`}>{value}</p>
        {sub && (
          <p className={`text-[10px] mt-0.5 truncate ${subClass ?? "text-muted-foreground"}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children, right }: { title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
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

function TabBar({
  tab,
  setTab,
  counts,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  counts: Record<Tab, number>;
}) {
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "saudi-stocks", label: "Saudi Stocks" },
    { key: "saudi-funds", label: "Saudi Funds" },
    { key: "usa", label: "USA Stocks" },
    { key: "gulf", label: "Gulf Stocks" },
    { key: "cash", label: "Cash" },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
            tab === t.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
          <span className="ml-1.5 text-[10px] text-muted-foreground">({NUM.format(counts[t.key])})</span>
        </button>
      ))}
    </div>
  );
}

function Th({ children, align = "left", onClick }: { children: React.ReactNode; align?: "left" | "right"; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} font-medium ${onClick ? "cursor-pointer hover:text-foreground select-none" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

function brokerList(brokers: Array<{ capitalFirm: string }>): string {
  if (brokers.length <= 1) return brokers[0]?.capitalFirm ?? "—";
  return `${brokers.length} brokers`;
}

function SaudiStocksTab({ rows, unmatched }: { rows: SaudiStock[]; unmatched: number }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof SaudiStock>("liveValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.stockCode.toLowerCase().includes(q) ||
            (r.companyName ?? "").toLowerCase().includes(q) ||
            (r.sector ?? "").toLowerCase().includes(q) ||
            r.brokers.some((b) => b.capitalFirm.toLowerCase().includes(q))
        )
      : rows;
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const na = av == null ? -Infinity : Number(av);
      const nb = bv == null ? -Infinity : Number(bv);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? na - nb : nb - na;
    });
  }, [rows, search, sortKey, sortDir]);

  function head(key: keyof SaudiStock) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggle(code: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Saudi Stocks</h3>
          <span className="text-[10px] text-muted-foreground">
            {filtered.length} of {rows.length} unique
          </span>
          {unmatched > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              {unmatched} unmatched (no live price found)
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search code, name, sector, broker…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs w-64 bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="w-6"></th>
              <Th onClick={() => head("stockCode")}>Code</Th>
              <Th onClick={() => head("companyName")}>Company</Th>
              <Th>Broker</Th>
              <Th align="right" onClick={() => head("qty")}>Qty</Th>
              <Th align="right" onClick={() => head("avgCost")}>Avg cost</Th>
              <Th align="right" onClick={() => head("livePrice")}>Live price</Th>
              <Th align="right" onClick={() => head("livePctChange")}>Today %</Th>
              <Th align="right" onClick={() => head("totalCost")}>Cost</Th>
              <Th align="right" onClick={() => head("liveValue")}>Live value</Th>
              <Th align="right" onClick={() => head("pnl")}>P/L</Th>
              <Th align="right" onClick={() => head("pnlPct")}>P/L %</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const pnlPos = (r.pnl ?? 0) >= 0;
              const dayPos = (r.livePctChange ?? 0) >= 0;
              const multi = r.brokers.length > 1;
              const open = expanded.has(r.stockCode);
              return (
                <>
                  <tr
                    key={r.stockCode}
                    className={`border-b border-border/40 hover:bg-accent/50 ${multi ? "cursor-pointer" : ""}`}
                    onClick={() => multi && toggle(r.stockCode)}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {multi && (
                        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">{r.stockCode}</td>
                    <td className="px-3 py-2 truncate max-w-[220px]">{r.companyName || <span className="text-muted-foreground italic">unknown</span>}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{brokerList(r.brokers)}</td>
                    <td className="px-3 py-2 text-right font-mono">{NUM.format(r.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.avgCost != null ? r.avgCost.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.livePrice?.toFixed(2) ?? "—"}</td>
                    <td className={`px-3 py-2 text-right font-mono ${r.livePctChange == null ? "text-muted-foreground" : dayPos ? "text-green-400" : "text-red-400"}`}>
                      {r.livePctChange != null ? PCT(r.livePctChange) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.totalCost != null ? SAR2.format(r.totalCost) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{r.liveValue != null ? SAR2.format(r.liveValue) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-mono ${r.pnl == null ? "text-muted-foreground" : pnlPos ? "text-green-400" : "text-red-400"}`}>
                      {r.pnl != null ? (pnlPos ? "+" : "") + SAR2.format(r.pnl) : "—"}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${r.pnlPct == null ? "text-muted-foreground" : pnlPos ? "text-green-400" : "text-red-400"}`}>
                      {r.pnlPct != null ? PCT(r.pnlPct) : "—"}
                    </td>
                  </tr>
                  {multi && open && r.brokers.map((b, i) => (
                    <tr key={r.stockCode + "-b-" + i} className="bg-background/40 border-b border-border/40 text-muted-foreground">
                      <td></td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">↳</td>
                      <td className="px-3 py-1.5 text-[11px]" colSpan={2}>
                        <span className="capitalize">{b.capitalFirm.toLowerCase()}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px]">{NUM.format(b.qty)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                        {b.totalCost != null && b.qty > 0 ? (b.totalCost / b.qty).toFixed(2) : "—"}
                      </td>
                      <td colSpan={3} className="px-3 py-1.5 text-right font-mono text-[11px]">{b.totalCost != null ? SAR2.format(b.totalCost) : "—"}</td>
                      <td colSpan={3} className="px-3 py-1.5 text-right font-mono text-[11px]">{b.brokerCurrentValue != null ? SAR2.format(b.brokerCurrentValue) : "—"}</td>
                    </tr>
                  ))}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">No matches</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SaudiFundsTab({ rows }: { rows: SaudiFund[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(key: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Saudi Funds <span className="text-[10px] text-muted-foreground ml-1">({rows.length} unique)</span></h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="w-6"></th>
              <th className="px-3 py-2 text-left font-medium">Fund</th>
              <th className="px-3 py-2 text-left font-medium">Broker(s)</th>
              <th className="px-3 py-2 text-right font-medium">Units</th>
              <th className="px-3 py-2 text-right font-medium">Avg cost/unit</th>
              <th className="px-3 py-2 text-right font-medium">Total cost</th>
              <th className="px-3 py-2 text-right font-medium">NAV</th>
              <th className="px-3 py-2 text-right font-medium">Market value</th>
              <th className="px-3 py-2 text-right font-medium">P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const pos = (f.pnl ?? 0) >= 0;
              const multi = f.brokers.length > 1;
              const open = expanded.has(f.fundName);
              return (
                <>
                  <tr
                    key={f.fundName}
                    className={`border-b border-border/40 hover:bg-accent/50 ${multi ? "cursor-pointer" : ""}`}
                    onClick={() => multi && toggle(f.fundName)}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {multi && (
                        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[360px] truncate" title={f.fundName}>{f.fundName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{brokerList(f.brokers)}</td>
                    <td className="px-3 py-2 text-right font-mono">{NUM.format(f.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono">{f.avgCostPerUnit?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{f.totalCost != null ? SAR2.format(f.totalCost) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{f.closePrice?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{f.marketValue != null ? SAR2.format(f.marketValue) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pos ? "text-green-400" : "text-red-400"}`}>
                      {f.pnl != null ? (pos ? "+" : "") + SAR2.format(f.pnl) : "—"}{" "}
                      {f.pnlPct != null && <span className="text-[10px] opacity-70">{PCT(f.pnlPct)}</span>}
                    </td>
                  </tr>
                  {multi && open && f.brokers.map((b, i) => (
                    <tr key={f.fundName + "-b-" + i} className="bg-background/40 border-b border-border/40 text-muted-foreground">
                      <td></td>
                      <td className="px-3 py-1.5 text-[11px]" colSpan={2}>↳ <span className="capitalize">{b.capitalFirm.toLowerCase()}</span></td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px]">{NUM.format(b.qty)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                        {b.totalCost != null && b.qty > 0 ? (b.totalCost / b.qty).toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px]">{b.totalCost != null ? SAR2.format(b.totalCost) : "—"}</td>
                      <td></td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px]">{b.marketValue != null ? SAR2.format(b.marketValue) : "—"}</td>
                      <td></td>
                    </tr>
                  ))}
                </>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No fund holdings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsaStocksTab({ rows }: { rows: UsaStock[] }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">USA Stocks</h3>
        <span className="text-[10px] text-muted-foreground">Values from broker snapshot (no live link)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Ticker</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
              <th className="px-3 py-2 text-right font-medium">Close</th>
              <th className="px-3 py-2 text-right font-medium">Market value</th>
              <th className="px-3 py-2 text-right font-medium">P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => {
              const pnl = u.profitLoss ?? ((u.marketValue ?? 0) - (u.costValue ?? 0));
              const pos = pnl >= 0;
              return (
                <tr key={i} className="border-b border-border/40 hover:bg-accent/50">
                  <td className="px-3 py-2 font-mono font-medium">{u.ticker}</td>
                  <td className="px-3 py-2 text-right font-mono">{NUM.format(u.qty)}</td>
                  <td className="px-3 py-2 text-right font-mono">{u.costValue != null ? SAR2.format(u.costValue) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{u.closePrice?.toFixed(2) ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{u.marketValue != null ? SAR2.format(u.marketValue) : "—"}</td>
                  <td className={`px-3 py-2 text-right font-mono ${pos ? "text-green-400" : "text-red-400"}`}>{(pos ? "+" : "") + SAR2.format(pnl)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No USA holdings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GulfStocksTab({ rows }: { rows: GulfStock[] }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gulf Stocks</h3>
        <span className="text-[10px] text-muted-foreground">Values from broker snapshot (no live link)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Broker</th>
              <th className="px-3 py-2 text-left font-medium">Market</th>
              <th className="px-3 py-2 text-left font-medium">Stock</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Current value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-accent/50">
                <td className="px-3 py-2 text-muted-foreground capitalize">{g.capitalFirm ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{g.market}</td>
                <td className="px-3 py-2 font-mono">{g.stockCode}</td>
                <td className="px-3 py-2 text-right font-mono">{NUM.format(g.qty)}</td>
                <td className="px-3 py-2 text-right font-mono">{g.marketPrice?.toFixed(3) ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono font-medium">{g.currentValue != null ? SAR2.format(g.currentValue) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No Gulf holdings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashTab({ rows, total }: { rows: CashRow[]; total: number }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cash positions</h3>
        <span className="text-[10px] text-muted-foreground">Total {SAR2.format(total)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Broker</th>
              <th className="px-3 py-2 text-left font-medium">Account / portfolio</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-accent/50">
                <td className="px-3 py-2 capitalize">{c.capitalFirm}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{c.portfolio ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono font-medium">{SAR2.format(c.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">No cash entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
