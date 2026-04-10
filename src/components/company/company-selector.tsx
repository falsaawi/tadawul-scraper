"use client";

import { useState } from "react";
import { Search, Loader2, RefreshCw, Filter } from "lucide-react";

const SECTORS = [
  "Energy", "Materials", "Capital Goods", "Commercial & Professional Svc", "Transportation",
  "Consumer Durables & Apparel", "Consumer Services", "Media and Entertainment",
  "Consumer Discretionary Distribution & Retail", "Consumer Staples Distribution & Retail",
  "Food & Beverages", "Household & Personal Products", "Health Care Equipment & Svc",
  "Pharma, Biotech & Life Science", "Banks", "Financial Services", "Insurance",
  "Software & Services", "Telecommunication Services", "Utilities", "REITs", "Real Estate Mgmt & Dev't",
];

interface Props {
  stocks: Array<{ symbol: string; companyName: string }>;
  selectedSymbol: string;
  selectedSector: string;
  onSymbolChange: (symbol: string) => void;
  onSectorChange: (sector: string) => void;
  onScrape: () => void;
  scraping: boolean;
  profileExists: boolean;
}

export function CompanySelector({
  stocks, selectedSymbol, selectedSector, onSymbolChange, onSectorChange, onScrape, scraping, profileExists,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStocks = stocks.filter((s) => {
    const matchesSearch = !searchTerm ||
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
          <Filter className="inline h-3 w-3 mr-1" />Sector
        </label>
        <select
          value={selectedSector}
          onChange={(e) => onSectorChange(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[180px]"
        >
          <option value="">All Sectors</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[250px]">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
          <Search className="inline h-3 w-3 mr-1" />Company
        </label>
        <select
          value={selectedSymbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <option value="">-- Select a company --</option>
          {filteredStocks.map((s) => (
            <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.companyName}</option>
          ))}
        </select>
      </div>

      {selectedSymbol && (
        <button
          onClick={onScrape}
          disabled={scraping}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {scraping ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Scraping...</>
          ) : (
            <><RefreshCw className="h-4 w-4" />{profileExists ? "Rescrape" : "Scrape Profile"}</>
          )}
        </button>
      )}
    </div>
  );
}
