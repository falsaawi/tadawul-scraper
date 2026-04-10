"use client";

import { Users } from "lucide-react";

interface BoardMember {
  id: string;
  tradingDate: string | null;
  shareholder: string | null;
  designation: string | null;
  sharesHeld: string | null;
  sharesPrev: string | null;
  sharesChange: string | null;
}

export function BoardCard({ members }: { members: BoardMember[] }) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-foreground">Shareholding & Board</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">{members.length}</span>
      </div>
      {members.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No board/shareholding data found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/30">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Shareholder</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase">Designation</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Shares Held</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.tradingDate || "-"}</td>
                  <td className="px-3 py-2 text-xs text-foreground font-medium">{m.shareholder || "-"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.designation || "-"}</td>
                  <td className="px-3 py-2 text-xs text-right text-foreground">{m.sharesHeld || "-"}</td>
                  <td className="px-3 py-2 text-xs text-right text-muted-foreground">{m.sharesChange || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
