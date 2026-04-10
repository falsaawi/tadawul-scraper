"use client";

import { Download } from "lucide-react";

export function ExportButtons() {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => window.open("/api/export/csv", "_blank")}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Download className="h-3 w-3" />
        CSV
      </button>
      <button
        onClick={() => window.open("/api/export/json", "_blank")}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Download className="h-3 w-3" />
        JSON
      </button>
    </div>
  );
}
