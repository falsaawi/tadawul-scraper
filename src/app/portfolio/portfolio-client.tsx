"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  Pencil,
  Check,
  X,
  Loader2,
  History,
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
import { HistoryModal } from "./history-modal";

type Tab = "saudi-stocks" | "saudi-funds" | "usa" | "gulf" | "cash";

interface BrokerSlice {
  id: string;
  capitalFirm: string;
  qty: number;
  totalCost: number | null;
  brokerCurrentValue: number | null;
  companyName: string | null;
  brokerMarketPrice: number | null;
}

interface SaudiStock {
  stockCode: string;
  companyName: string | null;
  customCompanyName: string | null;
  sector: string | null;
  qty: number;
  avgCost: number | null;
  totalCost: number | null;
  brokerMarketPrice: number | null;
  brokerCurrentValue: number | null;
  livePrice: number | null;
  liveValue: number | null;
  livePctChange: number | null;
  priceSource: "live" | "manual" | "none";
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
    id: string;
    capitalFirm: string;
    qty: number;
    totalCost: number | null;
    marketValue: number | null;
  }>;
}

interface UsaStock {
  id: string;
  ticker: string;
  qty: number;
  costValue: number | null;
  closePrice: number | null;
  marketValue: number | null;
  profitLoss: number | null;
}

interface GulfStock {
  id: string;
  capitalFirm: string | null;
  market: string;
  stockCode: string;
  qty: number;
  marketPrice: number | null;
  currentValue: number | null;
}

interface CashRow {
  id: string;
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
  brokerAllocation: Array<{
    broker: string;
    value: number;
    cost: number;
    investedValue: number;
    pnl: number;
    pnlPct: number;
  }>;
  gainByType: Array<{
    type: string;
    value: number;
    cost: number;
    pnl: number;
    pnlPct: number;
  }>;
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
  const [showHistory, setShowHistory] = useState(false);

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
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <History className="h-3 w-3" />
            History
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
          {tab === "saudi-stocks" && <SaudiStocksTab rows={data.saudiStocks} unmatched={data.totals.saudiStocksUnmatched} onUpdated={load} />}
          {tab === "saudi-funds" && <SaudiFundsTab rows={data.saudiFunds} onUpdated={load} />}
          {tab === "usa" && <UsaStocksTab rows={data.usaStocks} onUpdated={load} />}
          {tab === "gulf" && <GulfStocksTab rows={data.gulfStocks} onUpdated={load} />}
          {tab === "cash" && <CashTab rows={data.cash} total={data.totals.cash} onUpdated={load} />}
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
      <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
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
      <div className="grid grid-cols-1 gap-3">
        <GainByTypePanel rows={data.gainByType} />
        <GainByBrokerPanel rows={data.brokerAllocation} />
      </div>
    </div>
  );
}

function GainByTypePanel({
  rows,
}: {
  rows: ApiResponse["gainByType"];
}) {
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  return (
    <Panel
      title="Gain by asset type"
      right={
        <span className={`text-xs font-mono font-semibold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {(totalPnl >= 0 ? "+" : "") + SAR.format(totalPnl)} · {PCT(totalPct)}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <GainCard
            key={r.type}
            label={r.type}
            color={CATEGORY_COLOR[r.type] ?? "#22c55e"}
            value={r.value}
            cost={r.cost}
            pnl={r.pnl}
            pnlPct={r.pnlPct}
          />
        ))}
      </div>
    </Panel>
  );
}

function GainByBrokerPanel({
  rows,
}: {
  rows: ApiResponse["brokerAllocation"];
}) {
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  return (
    <Panel
      title="Gain by broker"
      right={
        <span className={`text-xs font-mono font-semibold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {(totalPnl >= 0 ? "+" : "") + SAR.format(totalPnl)} · {PCT(totalPct)}
        </span>
      }
    >
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">No broker data</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r, i) => (
            <GainCard
              key={r.broker}
              label={r.broker}
              color={COLORS[i % COLORS.length]}
              value={r.investedValue}
              cost={r.cost}
              pnl={r.pnl}
              pnlPct={r.pnlPct}
              capitalize
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function GainCard({
  label,
  color,
  value,
  cost,
  pnl,
  pnlPct,
  capitalize,
}: {
  label: string;
  color: string;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  capitalize?: boolean;
}) {
  const pos = pnl >= 0;
  const hasCost = cost > 0;
  return (
    <div className="bg-background border border-border rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
        <span className={`text-[11px] font-medium truncate ${capitalize ? "capitalize" : ""}`}>{label}</span>
      </div>
      {hasCost ? (
        <>
          <div className={`text-sm font-mono font-semibold ${pos ? "text-green-400" : "text-red-400"}`}>
            {(pos ? "+" : "") + SAR.format(pnl)}
          </div>
          <div className={`text-[10px] font-mono ${pos ? "text-green-400" : "text-red-400"}`}>
            {PCT(pnlPct)}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground">
            <span>{SAR.format(cost)}</span>
            <span>→ {SAR.format(value)}</span>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-mono font-semibold text-foreground">
            {SAR.format(value)}
          </div>
          <div className="text-[10px] text-muted-foreground">no cost basis</div>
        </>
      )}
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
        <div className="h-full min-h-[300px] flex items-center justify-center text-xs text-muted-foreground">
          Nothing to show
        </div>
      ) : (
        <div className="w-full h-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treeData}
              dataKey="size"
              stroke="#0f172a"
              isAnimationActive={false}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={<TreemapTile view={view} /> as any}
              onClick={(p) => onClickNode(p as TreemapPayload)}
            >
              <Tooltip content={<TreemapTooltip total={total} />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
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
          fillOpacity: 1,
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
          fontWeight={700}
          fill="#fff"
          stroke="#0f172a"
          strokeWidth={3}
          paintOrder="stroke"
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
          fontWeight={600}
          fill="#fff"
          stroke="#0f172a"
          strokeWidth={2.5}
          paintOrder="stroke"
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
          fontWeight={500}
          fill="#fff"
          stroke="#0f172a"
          strokeWidth={2.5}
          paintOrder="stroke"
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

function Panel({
  title,
  children,
  right,
  bodyClassName,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      <div className={`p-3 flex-1 min-h-0 ${bodyClassName ?? ""}`}>{children}</div>
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

function useSort<T, K extends string>(rows: T[], initialKey: K, getValue: (row: T, key: K) => string | number | null | undefined) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      const aNum = typeof av === "string" ? null : av == null ? null : Number(av);
      const bNum = typeof bv === "string" ? null : bv == null ? null : Number(bv);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const na = aNum == null ? -Infinity : aNum;
      const nb = bNum == null ? -Infinity : bNum;
      return sortDir === "asc" ? na - nb : nb - na;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);
  function head(k: K) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }
  return { sorted, sortKey, sortDir, head };
}

function useRowEdit(opts: { endpoint: (id: string) => string; onSuccess: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start(id: string, initial: Record<string, string | number | null | undefined>) {
    const v: Record<string, string> = {};
    for (const [k, val] of Object.entries(initial)) {
      v[k] = val == null ? "" : String(val);
    }
    setEditingId(id);
    setValues(v);
    setError(null);
  }
  function cancel() {
    setEditingId(null);
    setValues({});
    setError(null);
  }
  function setField(k: string, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
  }
  async function save(payload: Record<string, unknown>) {
    if (!editingId) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(opts.endpoint(editingId), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return false;
      }
      cancel();
      opts.onSuccess();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { editingId, values, setField, start, cancel, save, saving, error };
}

function EditNumberInput({
  value,
  onChange,
  onSave,
  onCancel,
  disabled,
  width = "w-20",
  step = "any",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
  width?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSave();
        if (e.key === "Escape") onCancel();
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={`${width} px-1.5 py-0.5 text-right font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50`}
    />
  );
}

function EditTextInput({
  value,
  onChange,
  onSave,
  onCancel,
  disabled,
  width = "w-28",
  align = "left",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
  width?: string;
  align?: "left" | "right";
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSave();
        if (e.key === "Escape") onCancel();
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={`${width} px-1.5 py-0.5 ${align === "right" ? "text-right" : "text-left"} font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50`}
    />
  );
}

function SaudiStocksTab({
  rows,
  unmatched,
  onUpdated,
}: {
  rows: SaudiStock[];
  unmatched: number;
  onUpdated: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof SaudiStock>("liveValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Identify the row currently in edit mode by the broker-slice id being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>("");
  const [editAvg, setEditAvg] = useState<string>("");
  const [editCode, setEditCode] = useState<string>("");
  const [editFirm, setEditFirm] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editPrice, setEditPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      let av: unknown = a[sortKey];
      let bv: unknown = b[sortKey];
      if (sortKey === "brokers") {
        av = a.brokers.length;
        bv = b.brokers.length;
      }
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

  function beginEdit(
    brokerId: string,
    qty: number,
    avgCost: number | null,
    stockCode: string,
    capitalFirm: string,
    companyName: string | null,
    brokerMarketPrice: number | null
  ) {
    setEditingId(brokerId);
    setEditQty(String(qty));
    setEditAvg(avgCost != null ? String(avgCost) : "");
    setEditCode(stockCode);
    setEditFirm(capitalFirm);
    setEditName(companyName ?? "");
    setEditPrice(brokerMarketPrice != null ? String(brokerMarketPrice) : "");
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQty("");
    setEditAvg("");
    setEditCode("");
    setEditFirm("");
    setEditName("");
    setEditPrice("");
    setSaveError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    const qty = Number(editQty);
    const avg = editAvg === "" ? null : Number(editAvg);
    const code = editCode.trim();
    const firm = editFirm.trim();
    if (!Number.isFinite(qty) || qty < 0) {
      setSaveError("Quantity must be a non-negative number");
      return;
    }
    if (avg != null && (!Number.isFinite(avg) || avg < 0)) {
      setSaveError("Avg cost must be a non-negative number");
      return;
    }
    if (!code) {
      setSaveError("Stock code is required");
      return;
    }
    if (!firm) {
      setSaveError("Broker is required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const priceVal = editPrice === "" ? null : Number(editPrice);
      if (priceVal != null && (!Number.isFinite(priceVal) || priceVal < 0)) {
        setSaveError("Manual price must be a non-negative number");
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/investment/saudi-stock/${editingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          qty,
          ...(avg != null ? { avgCost: avg } : {}),
          stockCode: code,
          capitalFirm: firm,
          companyName: editName.trim() || null,
          brokerMarketPrice: priceVal,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setSaveError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      cancelEdit();
      onUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function onEditKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Saudi Stocks</h3>
          <span className="text-[10px] text-muted-foreground">
            {filtered.length} of {rows.length} unique · click <Pencil className="inline h-2.5 w-2.5" /> to edit qty / avg cost
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
      {saveError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          {saveError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="w-6"></th>
              <Th onClick={() => head("stockCode")}>Code</Th>
              <Th onClick={() => head("companyName")}>Company</Th>
              <Th onClick={() => head("brokers")}>Broker</Th>
              <Th align="right" onClick={() => head("qty")}>Qty</Th>
              <Th align="right" onClick={() => head("avgCost")}>Avg cost</Th>
              <Th align="right" onClick={() => head("livePrice")}>Live price</Th>
              <Th align="right" onClick={() => head("livePctChange")}>Today %</Th>
              <Th align="right" onClick={() => head("totalCost")}>Cost</Th>
              <Th align="right" onClick={() => head("liveValue")}>Live value</Th>
              <Th align="right" onClick={() => head("pnl")}>P/L</Th>
              <Th align="right" onClick={() => head("pnlPct")}>P/L %</Th>
              <th className="px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const pnlPos = (r.pnl ?? 0) >= 0;
              const dayPos = (r.livePctChange ?? 0) >= 0;
              const multi = r.brokers.length > 1;
              const open = expanded.has(r.stockCode);
              const onlyBroker = !multi ? r.brokers[0] : undefined;
              const isEditingMain = onlyBroker && editingId === onlyBroker.id;
              return (
                <Fragment key={r.stockCode}>
                  <tr
                    className={`border-b border-border/40 hover:bg-accent/50 ${multi ? "cursor-pointer" : ""}`}
                    onClick={(e) => {
                      if (isEditingMain) return;
                      // Don't toggle if click came from edit cell input/button
                      const target = e.target as HTMLElement;
                      if (target.closest("input,button")) return;
                      if (multi) toggle(r.stockCode);
                    }}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {multi && (
                        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {isEditingMain ? (
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          onKeyDown={onEditKey}
                          disabled={saving}
                          className="w-16 px-1.5 py-0.5 font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      ) : (
                        r.stockCode
                      )}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[220px]">
                      {isEditingMain ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={onEditKey}
                          disabled={saving}
                          placeholder="Company name"
                          className="w-44 px-1.5 py-0.5 bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      ) : (
                        r.companyName || <span className="text-muted-foreground italic">unknown</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">
                      {isEditingMain ? (
                        <input
                          type="text"
                          value={editFirm}
                          onChange={(e) => setEditFirm(e.target.value)}
                          onKeyDown={onEditKey}
                          disabled={saving}
                          className="w-28 px-1.5 py-0.5 bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      ) : (
                        brokerList(r.brokers)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditingMain ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          onKeyDown={onEditKey}
                          disabled={saving}
                          className="w-20 px-1.5 py-0.5 text-right font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                          autoFocus
                        />
                      ) : (
                        NUM.format(r.qty)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditingMain ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editAvg}
                          onChange={(e) => setEditAvg(e.target.value)}
                          onKeyDown={onEditKey}
                          disabled={saving}
                          className="w-20 px-1.5 py-0.5 text-right font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="—"
                        />
                      ) : r.avgCost != null ? (
                        r.avgCost.toFixed(2)
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditingMain ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={onEditKey}
                          disabled={saving}
                          placeholder="manual"
                          className="w-20 px-1.5 py-0.5 text-right font-mono bg-input border border-primary/50 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      ) : r.livePrice != null ? (
                        <span title={r.priceSource === "manual" ? "Manual price (no live match)" : undefined}>
                          {r.livePrice.toFixed(2)}
                          {r.priceSource === "manual" && <span className="ml-1 text-[8px] text-yellow-400 align-top">M</span>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
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
                    <td className="px-2 py-2 text-right">
                      <EditCell
                        editable={!!onlyBroker}
                        editing={!!isEditingMain}
                        saving={saving && !!isEditingMain}
                        onEdit={() =>
                          onlyBroker &&
                          beginEdit(
                            onlyBroker.id,
                            r.qty,
                            r.avgCost,
                            r.stockCode,
                            onlyBroker.capitalFirm,
                            onlyBroker.companyName ?? r.customCompanyName,
                            onlyBroker.brokerMarketPrice ?? r.brokerMarketPrice
                          )
                        }
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        hint={multi ? "Expand to edit per broker" : undefined}
                      />
                    </td>
                  </tr>
                  {multi && open && r.brokers.map((b) => {
                    const isEditingThis = editingId === b.id;
                    const bAvg = b.totalCost != null && b.qty > 0 ? b.totalCost / b.qty : null;
                    return (
                      <tr
                        key={b.id}
                        className="bg-background/40 border-b border-border/40 text-muted-foreground"
                      >
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-[10px]">
                          {isEditingThis ? (
                            <input
                              type="text"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              onKeyDown={onEditKey}
                              disabled={saving}
                              className="w-16 px-1.5 py-0.5 font-mono bg-input border border-primary/50 rounded text-foreground"
                            />
                          ) : (
                            "↳"
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-[11px]" colSpan={2}>
                          {isEditingThis ? (
                            <input
                              type="text"
                              value={editFirm}
                              onChange={(e) => setEditFirm(e.target.value)}
                              onKeyDown={onEditKey}
                              disabled={saving}
                              className="w-28 px-1.5 py-0.5 bg-input border border-primary/50 rounded text-foreground"
                            />
                          ) : (
                            <span className="capitalize">{b.capitalFirm.toLowerCase()}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {isEditingThis ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              onKeyDown={onEditKey}
                              disabled={saving}
                              className="w-20 px-1.5 py-0.5 text-right font-mono bg-input border border-primary/50 rounded text-foreground"
                              autoFocus
                            />
                          ) : (
                            NUM.format(b.qty)
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {isEditingThis ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editAvg}
                              onChange={(e) => setEditAvg(e.target.value)}
                              onKeyDown={onEditKey}
                              disabled={saving}
                              className="w-20 px-1.5 py-0.5 text-right font-mono bg-input border border-primary/50 rounded text-foreground"
                              placeholder="—"
                            />
                          ) : bAvg != null ? (
                            bAvg.toFixed(2)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td colSpan={3} className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {b.totalCost != null ? SAR2.format(b.totalCost) : "—"}
                        </td>
                        <td colSpan={3} className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {b.brokerCurrentValue != null ? SAR2.format(b.brokerCurrentValue) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <EditCell
                            editable
                            editing={isEditingThis}
                            saving={saving && isEditingThis}
                            onEdit={() => beginEdit(b.id, b.qty, bAvg, r.stockCode, b.capitalFirm, b.companyName, b.brokerMarketPrice)}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">No matches</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditCell({
  editable,
  editing,
  saving,
  onEdit,
  onSave,
  onCancel,
  hint,
}: {
  editable: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  hint?: string;
}) {
  if (!editable) {
    return (
      <span className="text-[10px] text-muted-foreground/70" title={hint}>
        {hint ?? "—"}
      </span>
    );
  }
  if (editing) {
    return (
      <div className="inline-flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={saving}
          title="Save (Enter)"
          className="p-1 rounded text-green-400 hover:bg-green-500/10 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          disabled={saving}
          title="Cancel (Esc)"
          className="p-1 rounded text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      title="Edit qty / avg cost"
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      <Pencil className="h-3 w-3" />
    </button>
  );
}

function SaudiFundsTab({ rows, onUpdated }: { rows: SaudiFund[]; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const edit = useRowEdit({
    endpoint: (id) => `/api/investment/saudi-fund/${id}`,
    onSuccess: onUpdated,
  });
  type FundSortKey = "fundName" | "qty" | "avgCostPerUnit" | "totalCost" | "closePrice" | "marketValue" | "pnl" | "brokers";
  const { sorted, head } = useSort<SaudiFund, FundSortKey>(rows, "marketValue", (r, k) =>
    k === "brokers" ? r.brokers.length : (r[k] as string | number | null)
  );

  function toggle(key: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function saveFund() {
    const payload: Record<string, unknown> = {
      qty: Number(edit.values.qty),
      costPerUnit: edit.values.costPerUnit === "" ? null : Number(edit.values.costPerUnit),
      closePrice: edit.values.closePrice === "" ? null : Number(edit.values.closePrice),
    };
    if (edit.values.fundName != null) payload.fundName = edit.values.fundName;
    if (edit.values.capitalFirm != null) payload.capitalFirm = edit.values.capitalFirm;
    return edit.save(payload);
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">
          Saudi Funds <span className="text-[10px] text-muted-foreground ml-1">({rows.length} unique) · click <Pencil className="inline h-2.5 w-2.5" /> to edit</span>
        </h3>
      </div>
      {edit.error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">{edit.error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <th className="w-6"></th>
              <Th onClick={() => head("fundName")}>Fund</Th>
              <Th onClick={() => head("brokers")}>Broker(s)</Th>
              <Th align="right" onClick={() => head("qty")}>Units</Th>
              <Th align="right" onClick={() => head("avgCostPerUnit")}>Avg cost/unit</Th>
              <Th align="right" onClick={() => head("totalCost")}>Total cost</Th>
              <Th align="right" onClick={() => head("closePrice")}>NAV</Th>
              <Th align="right" onClick={() => head("marketValue")}>Market value</Th>
              <Th align="right" onClick={() => head("pnl")}>P/L</Th>
              <th className="px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => {
              const pos = (f.pnl ?? 0) >= 0;
              const multi = f.brokers.length > 1;
              const open = expanded.has(f.fundName);
              const onlyBroker = !multi ? f.brokers[0] : undefined;
              const isEditingMain = onlyBroker && edit.editingId === onlyBroker.id;
              return (
                <Fragment key={f.fundName}>
                  <tr
                    className={`border-b border-border/40 hover:bg-accent/50 ${multi ? "cursor-pointer" : ""}`}
                    onClick={(e) => {
                      if (isEditingMain) return;
                      const t = e.target as HTMLElement;
                      if (t.closest("input,button")) return;
                      if (multi) toggle(f.fundName);
                    }}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {multi && <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />}
                    </td>
                    <td className="px-3 py-2 max-w-[360px] truncate" title={f.fundName}>
                      {isEditingMain ? (
                        <EditTextInput value={edit.values.fundName ?? ""} onChange={(v) => edit.setField("fundName", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} width="w-full" />
                      ) : (
                        f.fundName
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {isEditingMain ? (
                        <EditTextInput value={edit.values.capitalFirm ?? ""} onChange={(v) => edit.setField("capitalFirm", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} width="w-28" />
                      ) : (
                        brokerList(f.brokers)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditingMain ? (
                        <EditNumberInput value={edit.values.qty ?? ""} onChange={(v) => edit.setField("qty", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} />
                      ) : NUM.format(f.qty)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditingMain ? (
                        <EditNumberInput value={edit.values.costPerUnit ?? ""} onChange={(v) => edit.setField("costPerUnit", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" />
                      ) : (f.avgCostPerUnit?.toFixed(2) ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{f.totalCost != null ? SAR2.format(f.totalCost) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditingMain ? (
                        <EditNumberInput value={edit.values.closePrice ?? ""} onChange={(v) => edit.setField("closePrice", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" />
                      ) : (f.closePrice?.toFixed(2) ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{f.marketValue != null ? SAR2.format(f.marketValue) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pos ? "text-green-400" : "text-red-400"}`}>
                      {f.pnl != null ? (pos ? "+" : "") + SAR2.format(f.pnl) : "—"}{" "}
                      {f.pnlPct != null && <span className="text-[10px] opacity-70">{PCT(f.pnlPct)}</span>}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <EditCell
                        editable={!!onlyBroker}
                        editing={!!isEditingMain}
                        saving={edit.saving && !!isEditingMain}
                        onEdit={() => onlyBroker && edit.start(onlyBroker.id, { qty: f.qty, costPerUnit: f.avgCostPerUnit, closePrice: f.closePrice, fundName: f.fundName, capitalFirm: onlyBroker.capitalFirm })}
                        onSave={saveFund}
                        onCancel={edit.cancel}
                        hint={multi ? "Expand to edit per broker" : undefined}
                      />
                    </td>
                  </tr>
                  {multi && open && f.brokers.map((b) => {
                    const bAvg = b.totalCost != null && b.qty > 0 ? b.totalCost / b.qty : null;
                    const isEditingThis = edit.editingId === b.id;
                    return (
                      <tr key={b.id} className="bg-background/40 border-b border-border/40 text-muted-foreground">
                        <td></td>
                        <td className="px-3 py-1.5 text-[11px]" colSpan={2}>
                          ↳{" "}
                          {isEditingThis ? (
                            <EditTextInput value={edit.values.capitalFirm ?? ""} onChange={(v) => edit.setField("capitalFirm", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} width="w-28" />
                          ) : (
                            <span className="capitalize">{b.capitalFirm.toLowerCase()}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {isEditingThis ? (
                            <EditNumberInput value={edit.values.qty ?? ""} onChange={(v) => edit.setField("qty", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} />
                          ) : NUM.format(b.qty)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {isEditingThis ? (
                            <EditNumberInput value={edit.values.costPerUnit ?? ""} onChange={(v) => edit.setField("costPerUnit", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" />
                          ) : (bAvg != null ? bAvg.toFixed(2) : "—")}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">{b.totalCost != null ? SAR2.format(b.totalCost) : "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">
                          {isEditingThis ? (
                            <EditNumberInput value={edit.values.closePrice ?? ""} onChange={(v) => edit.setField("closePrice", v)} onSave={saveFund} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" />
                          ) : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-[11px]">{b.marketValue != null ? SAR2.format(b.marketValue) : "—"}</td>
                        <td></td>
                        <td className="px-2 py-1.5 text-right">
                          <EditCell
                            editable
                            editing={isEditingThis}
                            saving={edit.saving && isEditingThis}
                            onEdit={() => edit.start(b.id, { qty: b.qty, costPerUnit: bAvg, closePrice: f.closePrice, capitalFirm: b.capitalFirm })}
                            onSave={saveFund}
                            onCancel={edit.cancel}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No fund holdings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsaStocksTab({ rows, onUpdated }: { rows: UsaStock[]; onUpdated: () => void }) {
  const edit = useRowEdit({
    endpoint: (id) => `/api/investment/usa-stock/${id}`,
    onSuccess: onUpdated,
  });
  type UsaSortKey = "ticker" | "qty" | "costValue" | "closePrice" | "marketValue" | "pnl";
  const { sorted, head } = useSort<UsaStock, UsaSortKey>(rows, "marketValue", (r, k) => {
    if (k === "pnl") return r.profitLoss ?? ((r.marketValue ?? 0) - (r.costValue ?? 0));
    return r[k as Exclude<UsaSortKey, "pnl">];
  });
  function saveUsa() {
    const payload: Record<string, unknown> = {
      qty: Number(edit.values.qty),
      costValue: edit.values.costValue === "" ? null : Number(edit.values.costValue),
      closePrice: edit.values.closePrice === "" ? null : Number(edit.values.closePrice),
    };
    if (edit.values.ticker != null) payload.ticker = edit.values.ticker;
    return edit.save(payload);
  }
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">USA Stocks</h3>
        <span className="text-[10px] text-muted-foreground">
          Values from broker snapshot · click <Pencil className="inline h-2.5 w-2.5" /> to edit
        </span>
      </div>
      {edit.error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">{edit.error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <Th onClick={() => head("ticker")}>Ticker</Th>
              <Th align="right" onClick={() => head("qty")}>Qty</Th>
              <Th align="right" onClick={() => head("costValue")}>Cost</Th>
              <Th align="right" onClick={() => head("closePrice")}>Close</Th>
              <Th align="right" onClick={() => head("marketValue")}>Market value</Th>
              <Th align="right" onClick={() => head("pnl")}>P/L</Th>
              <th className="px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const pnl = u.profitLoss ?? ((u.marketValue ?? 0) - (u.costValue ?? 0));
              const pos = pnl >= 0;
              const isEditing = edit.editingId === u.id;
              return (
                <tr key={u.id} className="border-b border-border/40 hover:bg-accent/50">
                  <td className="px-3 py-2 font-mono font-medium">
                    {isEditing ? (
                      <EditTextInput value={edit.values.ticker ?? ""} onChange={(v) => edit.setField("ticker", v)} onSave={saveUsa} onCancel={edit.cancel} disabled={edit.saving} width="w-20" />
                    ) : (
                      u.ticker
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {isEditing ? (
                      <EditNumberInput value={edit.values.qty ?? ""} onChange={(v) => edit.setField("qty", v)} onSave={saveUsa} onCancel={edit.cancel} disabled={edit.saving} />
                    ) : NUM.format(u.qty)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {isEditing ? (
                      <EditNumberInput value={edit.values.costValue ?? ""} onChange={(v) => edit.setField("costValue", v)} onSave={saveUsa} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" width="w-24" />
                    ) : (u.costValue != null ? SAR2.format(u.costValue) : "—")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {isEditing ? (
                      <EditNumberInput value={edit.values.closePrice ?? ""} onChange={(v) => edit.setField("closePrice", v)} onSave={saveUsa} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" />
                    ) : (u.closePrice?.toFixed(2) ?? "—")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{u.marketValue != null ? SAR2.format(u.marketValue) : "—"}</td>
                  <td className={`px-3 py-2 text-right font-mono ${pos ? "text-green-400" : "text-red-400"}`}>{(pos ? "+" : "") + SAR2.format(pnl)}</td>
                  <td className="px-2 py-2 text-right">
                    <EditCell
                      editable
                      editing={isEditing}
                      saving={edit.saving && isEditing}
                      onEdit={() => edit.start(u.id, { qty: u.qty, costValue: u.costValue, closePrice: u.closePrice, ticker: u.ticker })}
                      onSave={saveUsa}
                      onCancel={edit.cancel}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No USA holdings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GulfStocksTab({ rows, onUpdated }: { rows: GulfStock[]; onUpdated: () => void }) {
  const edit = useRowEdit({
    endpoint: (id) => `/api/investment/gulf-stock/${id}`,
    onSuccess: onUpdated,
  });
  type GulfSortKey = "capitalFirm" | "market" | "stockCode" | "qty" | "marketPrice" | "currentValue";
  const { sorted, head } = useSort<GulfStock, GulfSortKey>(rows, "currentValue", (r, k) => r[k]);
  function saveGulf() {
    const payload: Record<string, unknown> = {
      qty: Number(edit.values.qty),
      marketPrice: edit.values.marketPrice === "" ? null : Number(edit.values.marketPrice),
    };
    if (edit.values.capitalFirm != null) payload.capitalFirm = edit.values.capitalFirm;
    if (edit.values.market != null) payload.market = edit.values.market;
    if (edit.values.stockCode != null) payload.stockCode = edit.values.stockCode;
    return edit.save(payload);
  }
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gulf Stocks</h3>
        <span className="text-[10px] text-muted-foreground">
          Values from broker snapshot · click <Pencil className="inline h-2.5 w-2.5" /> to edit
        </span>
      </div>
      {edit.error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">{edit.error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <Th onClick={() => head("capitalFirm")}>Broker</Th>
              <Th onClick={() => head("market")}>Market</Th>
              <Th onClick={() => head("stockCode")}>Stock</Th>
              <Th align="right" onClick={() => head("qty")}>Qty</Th>
              <Th align="right" onClick={() => head("marketPrice")}>Price</Th>
              <Th align="right" onClick={() => head("currentValue")}>Current value</Th>
              <th className="px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => {
              const isEditing = edit.editingId === g.id;
              return (
                <tr key={g.id} className="border-b border-border/40 hover:bg-accent/50">
                  <td className="px-3 py-2 text-muted-foreground capitalize">
                    {isEditing ? (
                      <EditTextInput value={edit.values.capitalFirm ?? ""} onChange={(v) => edit.setField("capitalFirm", v)} onSave={saveGulf} onCancel={edit.cancel} disabled={edit.saving} width="w-28" />
                    ) : (
                      g.capitalFirm ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {isEditing ? (
                      <EditTextInput value={edit.values.market ?? ""} onChange={(v) => edit.setField("market", v)} onSave={saveGulf} onCancel={edit.cancel} disabled={edit.saving} width="w-20" />
                    ) : (
                      g.market
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {isEditing ? (
                      <EditTextInput value={edit.values.stockCode ?? ""} onChange={(v) => edit.setField("stockCode", v)} onSave={saveGulf} onCancel={edit.cancel} disabled={edit.saving} width="w-24" />
                    ) : (
                      g.stockCode
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {isEditing ? (
                      <EditNumberInput value={edit.values.qty ?? ""} onChange={(v) => edit.setField("qty", v)} onSave={saveGulf} onCancel={edit.cancel} disabled={edit.saving} />
                    ) : NUM.format(g.qty)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {isEditing ? (
                      <EditNumberInput value={edit.values.marketPrice ?? ""} onChange={(v) => edit.setField("marketPrice", v)} onSave={saveGulf} onCancel={edit.cancel} disabled={edit.saving} placeholder="—" />
                    ) : (g.marketPrice?.toFixed(3) ?? "—")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{g.currentValue != null ? SAR2.format(g.currentValue) : "—"}</td>
                  <td className="px-2 py-2 text-right">
                    <EditCell
                      editable
                      editing={isEditing}
                      saving={edit.saving && isEditing}
                      onEdit={() => edit.start(g.id, { qty: g.qty, marketPrice: g.marketPrice, capitalFirm: g.capitalFirm ?? "", market: g.market, stockCode: g.stockCode })}
                      onSave={saveGulf}
                      onCancel={edit.cancel}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No Gulf holdings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashTab({ rows, total, onUpdated }: { rows: CashRow[]; total: number; onUpdated: () => void }) {
  const edit = useRowEdit({
    endpoint: (id) => `/api/investment/cash/${id}`,
    onSuccess: onUpdated,
  });
  type CashSortKey = "capitalFirm" | "portfolio" | "amount";
  const { sorted, head } = useSort<CashRow, CashSortKey>(rows, "amount", (r, k) => r[k]);
  function saveCash() {
    const payload: Record<string, unknown> = { amount: Number(edit.values.amount) };
    if (edit.values.capitalFirm != null) payload.capitalFirm = edit.values.capitalFirm;
    if (edit.values.portfolio != null) payload.portfolio = edit.values.portfolio;
    return edit.save(payload);
  }
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cash positions</h3>
        <span className="text-[10px] text-muted-foreground">
          Total {SAR2.format(total)} · click <Pencil className="inline h-2.5 w-2.5" /> to edit
        </span>
      </div>
      {edit.error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">{edit.error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background border-b border-border text-muted-foreground">
            <tr>
              <Th onClick={() => head("capitalFirm")}>Broker</Th>
              <Th onClick={() => head("portfolio")}>Account / portfolio</Th>
              <Th align="right" onClick={() => head("amount")}>Amount</Th>
              <th className="px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const isEditing = edit.editingId === c.id;
              return (
                <tr key={c.id} className="border-b border-border/40 hover:bg-accent/50">
                  <td className="px-3 py-2 capitalize">
                    {isEditing ? (
                      <EditTextInput value={edit.values.capitalFirm ?? ""} onChange={(v) => edit.setField("capitalFirm", v)} onSave={saveCash} onCancel={edit.cancel} disabled={edit.saving} width="w-28" />
                    ) : (
                      c.capitalFirm
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {isEditing ? (
                      <EditTextInput value={edit.values.portfolio ?? ""} onChange={(v) => edit.setField("portfolio", v)} onSave={saveCash} onCancel={edit.cancel} disabled={edit.saving} width="w-40" />
                    ) : (
                      c.portfolio ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    {isEditing ? (
                      <EditNumberInput value={edit.values.amount ?? ""} onChange={(v) => edit.setField("amount", v)} onSave={saveCash} onCancel={edit.cancel} disabled={edit.saving} width="w-28" />
                    ) : SAR2.format(c.amount)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <EditCell
                      editable
                      editing={isEditing}
                      saving={edit.saving && isEditing}
                      onEdit={() => edit.start(c.id, { amount: c.amount, capitalFirm: c.capitalFirm, portfolio: c.portfolio ?? "" })}
                      onSave={saveCash}
                      onCancel={edit.cancel}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No cash entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
