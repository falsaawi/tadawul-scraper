"use client";

import { useEffect, useState } from "react";
import { DollarSign, ChevronDown, ChevronUp, Landmark, Receipt, Wallet } from "lucide-react";

interface FinancialData {
  unit: string;
  balanceSheet: Record<string, string>;
  incomeStatement: Record<string, string>;
  cashFlows: Record<string, string>;
}

interface Statement {
  id: string;
  period: string;
  type: string;
  data: FinancialData;
}

const SAR_ITEMS = ["Profit (Loss) per Share"];

function fmtVal(v: string, unit: string, itemName: string): string {
  if (!v || v === "-") return "-";
  const num = parseFloat(v.replace(/,/g, ""));
  if (isNaN(num)) return v;
  // EPS is always in SAR, not in thousands
  if (SAR_ITEMS.includes(itemName)) {
    return num.toFixed(2) + " SAR";
  }
  // Other values are in thousands from Tadawul
  if (unit === "Thousands") {
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + "B";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "M";
    return num.toFixed(0) + "K";
  }
  return num.toLocaleString("en-US");
}

function isNeg(v: string): boolean {
  return v?.trim().startsWith("-") || false;
}

function StatementTable({
  title,
  icon,
  iconColor,
  periods,
  statements,
  keys,
  unit,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  periods: string[];
  statements: Statement[];
  keys: string[];
  unit: string;
}) {
  if (keys.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Figures in {unit}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-accent/30">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-accent/30 min-w-[220px]">
                Item
              </th>
              {periods.map((p) => (
                <th key={p} className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[90px]">
                  {p.substring(0, 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.map((key) => (
              <tr key={key} className="hover:bg-accent/20 transition-colors">
                <td className="px-3 py-2 text-xs text-foreground sticky left-0 bg-card">
                  {key}
                </td>
                {statements.map((s) => {
                  const section = title.includes("Balance") ? s.data.balanceSheet
                    : title.includes("Income") ? s.data.incomeStatement
                    : s.data.cashFlows;
                  const val = section?.[key] || "-";
                  return (
                    <td key={s.period} className={`px-3 py-2 text-xs text-right font-mono ${isNeg(val) ? "text-red-400" : "text-foreground"}`}>
                      {fmtVal(val, s.data.unit || "Thousands", key)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinancialsCard({ symbol }: { symbol: string }) {
  const [annual, setAnnual] = useState<Statement[]>([]);
  const [quarterly, setQuarterly] = useState<Statement[]>([]);
  const [tab, setTab] = useState<"annual" | "quarterly">("annual");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/company/financials?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setAnnual(data.annual || []);
          setQuarterly(data.quarterly || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchData();
  }, [symbol]);

  if (loading) {
    return <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground animate-pulse">Loading financials...</div>;
  }

  if (annual.length === 0 && quarterly.length === 0) return null;

  const statements = tab === "annual" ? annual : quarterly;
  const periods = statements.map((s) => s.period);

  // Fixed order matching Tadawul website
  const BS_ORDER = [
    "Total Assets", "Total Liabilities",
    "Total Shareholders Equity (After Deducting the Minority Equity)",
    "Total Liabilities and Shareholders Equity",
    // Historical detail items
    "Current Assets", "Inventory", "Investments", "Fixed Assets", "Other Assets",
    "Current Liabilities", "Non-Current Liabilities", "Other Liabilities",
    "Shareholders Equity", "Total Liabilities and Shareholder Equity", "Minority Interests",
  ];
  const IS_ORDER = [
    "Total Revenue (Sales/Operating)",
    "Net Profit (Loss) before Zakat and Tax",
    "Zakat and Income Tax",
    "Net Profit (Loss) Attributable to Shareholders of the Issuer",
    "Total Comprehensive Income Attributable to Shareholders of the Issuer",
    "Profit (Loss) per Share",
  ];
  const CF_ORDER = [
    "Net Cash From Operating Activities",
    "Net Cash From Investing Activities",
    "Net Cash From Financing Activities",
    "Cash and Cash Equivalents, Beginning of the Period",
    "Cash and Cash Equivalents, End of the Period",
  ];

  // Collect keys that exist in the data, maintaining the defined order
  const bsKeysSet = new Set<string>();
  const isKeysSet = new Set<string>();
  const cfKeysSet = new Set<string>();
  statements.forEach((s) => {
    const d = s.data as FinancialData;
    if (d.balanceSheet) Object.keys(d.balanceSheet).forEach((k) => bsKeysSet.add(k));
    if (d.incomeStatement) Object.keys(d.incomeStatement).forEach((k) => isKeysSet.add(k));
    if (d.cashFlows) Object.keys(d.cashFlows).forEach((k) => cfKeysSet.add(k));
  });

  // Order: defined order first, then any remaining keys
  const orderKeys = (order: string[], existing: Set<string>) => {
    const ordered = order.filter((k) => existing.has(k));
    const remaining = Array.from(existing).filter((k) => !order.includes(k));
    return [...ordered, ...remaining];
  };

  const bsKeys = orderKeys(BS_ORDER, bsKeysSet);
  const isKeys = orderKeys(IS_ORDER, isKeysSet);
  const cfKeys = orderKeys(CF_ORDER, cfKeysSet);

  const unit = (statements[0]?.data as FinancialData)?.unit || "Thousands";

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-foreground">Financial Statements</h2>
        </div>
        <div className="flex gap-0.5 bg-accent rounded-lg p-0.5">
          <button
            onClick={() => setTab("annual")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual ({annual.length})
          </button>
          <button
            onClick={() => setTab("quarterly")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "quarterly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Quarterly ({quarterly.length})
          </button>
        </div>
      </div>

      {/* Three separate statement tables */}
      <StatementTable
        title="Balance Sheet"
        icon={<Landmark className="h-4 w-4 text-blue-400" />}
        iconColor="text-blue-400"
        periods={periods}
        statements={statements}
        keys={bsKeys}
        unit={unit}
      />

      <StatementTable
        title="Statement of Income"
        icon={<Receipt className="h-4 w-4 text-green-400" />}
        iconColor="text-green-400"
        periods={periods}
        statements={statements}
        keys={isKeys}
        unit={unit}
      />

      <StatementTable
        title="Cash Flows"
        icon={<Wallet className="h-4 w-4 text-amber-400" />}
        iconColor="text-amber-400"
        periods={periods}
        statements={statements}
        keys={cfKeys}
        unit={unit}
      />
    </div>
  );
}
