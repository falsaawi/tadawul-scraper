"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";
import Link from "next/link";

export function Header() {
  const [time, setTime] = useState("");
  const [status, setStatus] = useState({ isOpen: false, message: "", nextEvent: "" });

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleString("en-US", {
          timeZone: "Asia/Riyadh",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      const riyadhStr = now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" });
      const riyadh = new Date(riyadhStr);
      const day = riyadh.getDay();
      const h = riyadh.getHours();
      const m = riyadh.getMinutes();
      const t = h * 60 + m;

      if (day >= 5) {
        setStatus({ isOpen: false, message: "Weekend", nextEvent: "Opens Sunday 10:00 AM" });
      } else if (t < 600) {
        setStatus({ isOpen: false, message: "Pre-Market", nextEvent: "Opens 10:00 AM" });
      } else if (t <= 900) {
        setStatus({ isOpen: true, message: "Market Open", nextEvent: "Closes 3:00 PM" });
      } else {
        setStatus({
          isOpen: false,
          message: "After Hours",
          nextEvent: day === 4 ? "Opens Sunday 10:00 AM" : "Opens tomorrow 10:00 AM",
        });
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span>Tadawul Scraper</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/data"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Data Explorer
            </Link>
            <Link
              href="/analytics"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Analytics
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Riyadh Time (AST)</div>
            <div className="text-sm font-mono font-medium">{time}</div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
            <Activity
              className={`h-3.5 w-3.5 ${status.isOpen ? "text-green-500" : "text-red-500"}`}
            />
            <span className="font-medium">{status.message}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
