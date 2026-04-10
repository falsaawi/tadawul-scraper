"use client";

import { Building2, Calendar } from "lucide-react";

interface Props {
  companyName: string;
  symbol: string;
  sector: string | null;
  details: Record<string, string> | null;
  scrapedAt: string;
}

export function ProfileCard({ companyName, symbol, sector, details, scrapedAt }: Props) {
  const detailEntries = details ? Object.entries(details) : [];

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{companyName}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{symbol}</span>
            {sector && <span className="px-2 py-0.5 rounded bg-accent text-accent-foreground">{sector}</span>}
          </div>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <Calendar className="inline h-3 w-3 mr-1" />
          Last scraped: {new Date(scrapedAt).toLocaleString("en-US", {
            timeZone: "Asia/Riyadh", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
          })}
        </div>
      </div>

      {detailEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detailEntries.map(([key, value]) => (
            <div key={key} className="bg-accent/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
