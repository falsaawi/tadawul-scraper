"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

interface Session {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  error: string | null;
  rowCount: number;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "running")
    return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "In progress...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ScrapeStatus({ refreshKey }: { refreshKey: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=10");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Scrape Log</h3>
      </div>
      {sessions.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No scrape sessions yet
        </div>
      ) : (
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {sessions.map((s) => (
            <div key={s.id} className="p-3 flex items-start gap-3 hover:bg-secondary/30 transition-colors">
              <StatusIcon status={s.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{s.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(s.startedAt, s.finishedAt)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(s.startedAt).toLocaleString("en-US", {
                    timeZone: "Asia/Riyadh",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </div>
                {s.status === "completed" && (
                  <div className="text-xs text-green-600 mt-0.5">
                    {s.rowCount} stocks scraped
                  </div>
                )}
                {s.error && (
                  <div className="text-xs text-red-600 mt-0.5 truncate" title={s.error}>
                    {s.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
