export interface TimeSeriesPoint {
  scrapedAt: string;
  lastTradePrice: number | null;
  lastTradeVolume: number | null;
  cumulativeVolume: number | null;
  numberOfTrades: number | null;
  bestBidPrice: number | null;
  bestOfferPrice: number | null;
}

export interface StockSnapshot {
  todayOpen: number | null;
  todayHigh: number | null;
  todayLow: number | null;
  lastTradePrice: number | null;
  lastTradeChange: number | null;
  lastTradePctChange: number | null;
  week52High: number | null;
  week52Low: number | null;
  cumulativeVolume: number | null;
  numberOfTrades: number | null;
  bestBidPrice: number | null;
  bestOfferPrice: number | null;
}

export interface StockAnalysis {
  priceRange: { min: number; max: number; spread: number };
  avgBidAskSpread: number;
  avgBidAskSpreadPct: number;
  vwap: number;
  priceVolatility: number;
  week52Position: number;
}

export interface MarketMover {
  symbol: string;
  companyName: string;
  lastTradePrice: number | null;
  lastTradePctChange: number | null;
  cumulativeVolume: number | null;
  numberOfTrades: number | null;
}

export interface MarketStats {
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  totalTrades: number;
}

export interface AnalyticsTimeSeriesResponse {
  stock: { symbol: string; companyName: string };
  timeSeries: TimeSeriesPoint[];
  snapshot: StockSnapshot;
  analysis: StockAnalysis;
}

export interface AnalyticsSummaryResponse {
  date: string;
  stockList: Array<{ symbol: string; companyName: string }>;
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  mostActive: MarketMover[];
  marketStats: MarketStats;
}
