"use client";

import { useEffect, useState } from "react";
import { X, Loader2, RefreshCw, History as HistoryIcon } from "lucide-react";

interface TxRow {
  id: string;
  createdAt: string;
  entityType: string;
  entityId: string | null;
  action: string;
  summary: string | null;
  changes: Record<string, unknown>;
}

const TYPE_LABEL: Record<string, string> = {
  upload: "Upload",
  "saudi-stock": "Saudi stock",
  "saudi-fund": "Saudi fund",
  "usa-stock": "USA stock",
  "gulf-stock": "Gulf stock",
  cash: "Cash",
};

const TYPE_COLOR: Record<string, string> = {
  upload: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "saudi-stock": "bg-green-500/10 text-green-400 border-green-500/20",
  "saudi-fund": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "usa-stock": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "gulf-stock": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cash: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

function fmtDateTime(d: string): string {
  try {
    return new Date(d).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return d;
  }
}

function fmtVal(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    if (Number.isInteger(v) || Math.abs(v) >= 1000) return v.toLocaleString();
    return v.toFixed(2);
  }
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 57) + "…" : v;
  return JSON.stringify(v);
}

export function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const qs = filter ? `?entityType=${encodeURIComponent(filter)}&limit=100` : "?limit=100";
      const res = await fetch(`/api/investment/transactions${qs}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { rows: TxRow[]; pagination: { total: number } };
        setRows(data.rows);
        setTotal(data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Portfolio history</h2>
            <span className="text-[10px] text-muted-foreground">{total.toLocaleString()} total events</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-input text-foreground text-xs"
            >
              <option value="">All types</option>
              <option value="upload">Uploads</option>
              <option value="saudi-stock">Saudi stocks</option>
              <option value="saudi-fund">Saudi funds</option>
              <option value="usa-stock">USA stocks</option>
              <option value="gulf-stock">Gulf stocks</option>
              <option value="cash">Cash</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              title="Refresh"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No transactions yet. Uploads and edits will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="border border-border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLOR[r.entityType] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {TYPE_LABEL[r.entityType] ?? r.entityType}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {r.action}
                      </span>
                      {r.summary && (
                        <span className="text-xs text-foreground font-medium truncate max-w-[400px]">
                          {r.summary}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                      {fmtDateTime(r.createdAt)}
                    </span>
                  </div>
                  <ChangesSummary action={r.action} changes={r.changes} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangesSummary({ action, changes }: { action: string; changes: Record<string, unknown> }) {
  if (action === "upload") {
    const counts = (changes.counts ?? {}) as Record<string, number>;
    const file = String(changes.fileName ?? "");
    return (
      <div className="text-[11px] text-muted-foreground">
        {file && <span className="font-mono">{file}</span>}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(counts).map(([k, v]) => (
            v > 0 ? <span key={k}><span className="text-foreground">{v}</span> {k}</span> : null
          ))}
        </div>
      </div>
    );
  }
  // update — list field diffs
  const entries = Object.entries(changes) as Array<[string, { from: unknown; to: unknown }]>;
  if (entries.length === 0) {
    return <div className="text-[11px] text-muted-foreground">No field changes.</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
      {entries.map(([field, v]) => (
        <div key={field} className="flex items-baseline gap-2">
          <span className="text-muted-foreground min-w-[90px]">{field}</span>
          <span className="font-mono text-red-400 line-through opacity-70">{fmtVal(v?.from)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono text-green-400">{fmtVal(v?.to)}</span>
        </div>
      ))}
    </div>
  );
}
