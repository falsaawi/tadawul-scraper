"use client";

import { Banknote } from "lucide-react";

interface Dividend {
  id: string;
  announcedDate: string | null;
  eligibilityDate: string | null;
  distributionDate: string | null;
  distributionWay: string | null;
  dividendAmount: string | null;
}

export function DividendsCard({ dividends }: { dividends: Dividend[] }) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Banknote className="h-4 w-4 text-green-400" />
        <h3 className="text-sm font-semibold text-foreground">Dividends</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">{dividends.length}</span>
      </div>
      {dividends.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No dividend data found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/30">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Announced</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Eligibility</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Distribution</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Way</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dividends.map((d) => (
                <tr key={d.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2 text-xs text-foreground">{d.announcedDate || "-"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{d.eligibilityDate || "-"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{d.distributionDate || "-"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{d.distributionWay || "-"}</td>
                  <td className="px-3 py-2 text-xs text-right font-medium text-green-400">{d.dividendAmount || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
