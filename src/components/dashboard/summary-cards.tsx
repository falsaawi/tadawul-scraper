"use client";

import { useEffect, useState } from "react";
import { Database, Clock, RefreshCw, TrendingUp } from "lucide-react";

interface Summary {
  totalStocks: number;
  lastScrapeTime: string | null;
  totalScrapesToday: number;
  lastScrapeStatus: string | null;
}

export function SummaryCards() {
  const [summary, setSummary] = useState<Summary>({
    totalStocks: 0,
    lastScrapeTime: null,
    totalScrapesToday: 0,
    lastScrapeStatus: null,
  });

  useEffect(() => {
    async function fetchSummary() {
      try {
        const [logsRes, dataRes] = await Promise.all([
          fetch("/api/logs?limit=50"),
          fetch("/api/data?latest=true&limit=1"),
        ]);
        const logsData = await logsRes.json();
        const stockData = await dataRes.json();

        const sessions = logsData.sessions || [];
        const today = new Date().toISOString().split("T")[0];
        const todaySessions = sessions.filter(
          (s: { startedAt: string }) => s.startedAt.startsWith(today)
        );
        const lastSession = sessions[0];

        setSummary({
          totalStocks: stockData.pagination?.total || 0,
          lastScrapeTime: lastSession?.startedAt || null,
          totalScrapesToday: todaySessions.length,
          lastScrapeStatus: lastSession?.status || null,
        });
      } catch {
        // Silently fail on first load
      }
    }

    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: "Stocks Tracked",
      value: summary.totalStocks || "0",
      icon: TrendingUp,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Last Scrape",
      value: summary.lastScrapeTime
        ? new Date(summary.lastScrapeTime).toLocaleTimeString("en-US", {
            timeZone: "Asia/Riyadh",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Never",
      icon: Clock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      title: "Scrapes Today",
      value: summary.totalScrapesToday,
      icon: RefreshCw,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      title: "Last Status",
      value: summary.lastScrapeStatus
        ? summary.lastScrapeStatus.charAt(0).toUpperCase() + summary.lastScrapeStatus.slice(1)
        : "N/A",
      icon: Database,
      color:
        summary.lastScrapeStatus === "completed"
          ? "text-green-400"
          : summary.lastScrapeStatus === "failed"
          ? "text-red-400"
          : "text-yellow-400",
      bg:
        summary.lastScrapeStatus === "completed"
          ? "bg-green-500/10"
          : summary.lastScrapeStatus === "failed"
          ? "bg-red-500/10"
          : "bg-yellow-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"
        >
          <div className={`${card.bg} p-2.5 rounded-lg`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{card.title}</p>
            <p className="text-lg font-semibold text-foreground">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
