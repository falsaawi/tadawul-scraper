"use client";

import { Search, Loader2, RefreshCw, Filter } from "lucide-react";

const SECTOR_MAP: Record<string, string[]> = {
  "Energy": ["2030","2222","2380","2381","2382","4030"],
  "Materials": ["1201","1202","1210","1211","1301","1304","1320","1321","1322","1323","1324","2001","2010","2020","2060","2090","2150","2170","2180","2200","2210","2220","2223","2240","2250","2290","2300","2310","2330","2350","2360","3002","3003","3004","3005","3007","3008","3010","3020","3030","3040","3050","3060","3080","3090","3091","3092","4143"],
  "Capital Goods": ["1212","1214","1302","1303","2040","2110","2160","2320","2370","4110","4140","4141","4142","4144","4145","4146","4147","4148"],
  "Commercial & Professional Svc": ["1831","1832","1833","1834","1835","4270","6004"],
  "Transportation": ["2190","4031","4040","4260","4261","4262","4263","4264","4265"],
  "Consumer Durables & Apparel": ["1213","2130","2340","4011","4012","4180"],
  "Consumer Services": ["1810","1820","1830","4170","4290","4291","4292","6002","6012","6013","6014","6015","6016","6017","6018","6019"],
  "Media and Entertainment": ["4070","4071","4072","4210"],
  "Consumer Discretionary Distribution & Retail": ["4003","4008","4050","4051","4190","4191","4192","4193","4194","4200","4240"],
  "Consumer Staples Distribution & Retail": ["4001","4006","4061","4160","4161","4162","4163","4164"],
  "Food & Beverages": ["2050","2100","2270","2280","2281","2282","2283","2284","2285","2286","2287","2288","4080","6001","6010","6020","6040","6050","6060","6070","6090"],
  "Household & Personal Products": ["4165"],
  "Health Care Equipment & Svc": ["2140","2230","4002","4004","4005","4007","4009","4013","4014","4017","4018","4019","4021"],
  "Pharma, Biotech & Life Science": ["2070","4015","4016"],
  "Banks": ["1010","1020","1030","1050","1060","1080","1120","1140","1150","1180"],
  "Financial Services": ["1111","1182","1183","2120","4081","4082","4083","4084","4130","4280"],
  "Insurance": ["8010","8012","8020","8030","8040","8050","8060","8070","8100","8120","8150","8160","8170","8180","8190","8200","8210","8230","8240","8250","8260","8280","8300","8310","8311","8313"],
  "Software & Services": ["7200","7201","7202","7203","7204","7211"],
  "Telecommunication Services": ["7010","7020","7030","7040"],
  "Utilities": ["2080","2081","2082","2083","2084","5110"],
  "REITs": ["4330","4331","4332","4333","4334","4335","4336","4337","4338","4339","4340","4342","4344","4345","4346","4347","4348","4349","4350"],
  "Real Estate Mgmt & Dev't": ["4020","4090","4100","4150","4220","4230","4250","4300","4310","4320","4321","4322","4323","4324","4325","4326","4327"],
};

const SECTORS = Object.keys(SECTOR_MAP);

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
  const sectorSymbols = selectedSector ? new Set(SECTOR_MAP[selectedSector] || []) : null;

  const filteredStocks = stocks.filter((s) => {
    if (sectorSymbols && !sectorSymbols.has(s.symbol)) return false;
    return true;
  });

  function handleSectorChange(sector: string) {
    onSectorChange(sector);
    // Reset company selection if current company is not in new sector
    if (sector && selectedSymbol) {
      const newSectorSymbols = new Set(SECTOR_MAP[sector] || []);
      if (!newSectorSymbols.has(selectedSymbol)) {
        onSymbolChange("");
      }
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
          <Filter className="inline h-3 w-3 mr-1" />Sector
        </label>
        <select
          value={selectedSector}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[180px]"
        >
          <option value="">All Sectors ({stocks.length})</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s} ({SECTOR_MAP[s].length})</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[250px]">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
          <Search className="inline h-3 w-3 mr-1" />Company ({filteredStocks.length})
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
