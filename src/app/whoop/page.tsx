"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { WhoopConnectPanel } from "@/components/whoop/connect-panel";
import { WhoopSummary } from "@/components/whoop/summary-cards";
import { WhoopCharts } from "@/components/whoop/charts";
import { WhoopWorkouts } from "@/components/whoop/workouts-table";
import { Activity } from "lucide-react";
import type { WhoopData, WhoopStatus } from "@/types/whoop-dashboard";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function WhoopPage() {
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [data, setData] = useState<WhoopData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whoop/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/whoop/data?days=${days}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const connected = status?.connected ?? false;
  const hasData =
    data && (data.daily.length > 0 || data.sleep.length > 0 || data.workouts.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              WHOOP
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Recovery, sleep, strain and workouts pulled from the WHOOP API
            </p>
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  days === r.days
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <WhoopConnectPanel
          status={status}
          onChanged={() => {
            fetchStatus();
            fetchData();
          }}
        />

        {connected && hasData && data && (
          <>
            <WhoopSummary data={data} />
            <WhoopCharts data={data} />
            <WhoopWorkouts workouts={data.workouts} />
          </>
        )}

        {connected && !hasData && !loading && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            No WHOOP data yet. Click <span className="text-foreground font-medium">Sync now</span>{" "}
            to pull your latest recovery, sleep and workouts.
          </div>
        )}
      </main>
    </div>
  );
}
