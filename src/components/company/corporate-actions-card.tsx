"use client";

import { FileText } from "lucide-react";

interface CorporateAction {
  id: string;
  title: string;
  date: string | null;
  details: string | null;
}

export function CorporateActionsCard({ actions }: { actions: CorporateAction[] }) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <FileText className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground">Corporate Actions</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">{actions.length}</span>
      </div>
      {actions.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No corporate actions found</div>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {actions.map((a) => (
            <div key={a.id} className="px-4 py-3 hover:bg-accent/30 transition-colors">
              <p className="text-sm text-foreground leading-snug">{a.title}</p>
              {a.date && <p className="text-[10px] text-muted-foreground mt-1">{a.date}</p>}
              {a.details && <p className="text-xs text-muted-foreground mt-1">{a.details}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
