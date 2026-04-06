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
      color: "text-blue-600",
      bg: "bg-blue-50",
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
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Scrapes Today",
      value: summary.totalScrapesToday,
      icon: RefreshCw,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Last Status",
      value: summary.lastScrapeStatus
        ? summary.lastScrapeStatus.charAt(0).toUpperCase() + summary.lastScrapeStatus.slice(1)
        : "N/A",
      icon: Database,
      color:
        summary.lastScrapeStatus === "completed"
          ? "text-green-600"
          : summary.lastScrapeStatus === "failed"
          ? "text-red-600"
          : "text-yellow-600",
      bg:
        summary.lastScrapeStatus === "completed"
          ? "bg-green-50"
          : summary.lastScrapeStatus === "failed"
          ? "bg-red-50"
          : "bg-yellow-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-xl border p-5 flex items-center gap-4"
        >
          <div className={`${card.bg} p-3 rounded-lg`}>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-xl font-semibold">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
