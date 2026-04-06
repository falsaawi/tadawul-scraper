"use client";

import { Download, FileJson, FileSpreadsheet } from "lucide-react";

export function ExportButtons() {
  function handleExport(format: "csv" | "json") {
    const url = `/api/export/${format}`;
    window.open(url, "_blank");
  }

  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold mb-3">Export Data</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Download the latest scraped data in your preferred format.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => handleExport("csv")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-secondary transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
          <Download className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={() => handleExport("json")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-secondary transition-colors"
        >
          <FileJson className="h-4 w-4" />
          Export JSON
          <Download className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
