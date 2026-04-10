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
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Tadawul</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/analytics"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Analytics
            </Link>
            <Link
              href="/company"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Company
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Riyadh</div>
            <div className="text-sm font-mono font-medium text-foreground">{time}</div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              status.isOpen
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <Activity className={`h-3 w-3 ${status.isOpen ? "text-green-400" : "text-red-400"}`} />
            {status.message}
          </div>
        </div>
      </div>
    </header>
  );
}
