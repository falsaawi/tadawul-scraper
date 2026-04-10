"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Session {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  error: string | null;
  rowCount: number;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ScrapeStatus({ refreshKey }: { refreshKey: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=20");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  const visible = expanded ? sessions : sessions.slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Scrape Log</h3>
        {sessions.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show all ({sessions.length}) <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>
      {sessions.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No scrape sessions yet</div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((s) => (
            <div key={s.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors">
              <StatusIcon status={s.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium capitalize text-foreground">{s.status}</span>
                  {s.status === "completed" && (
                    <span className="text-[10px] text-green-400">{s.rowCount} stocks</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(s.startedAt).toLocaleString("en-US", {
                    timeZone: "Asia/Riyadh",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
                {s.error && (
                  <div className="text-[10px] text-red-400 truncate" title={s.error}>{s.error}</div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{formatDuration(s.startedAt, s.finishedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
