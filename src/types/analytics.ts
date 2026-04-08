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
  lastTradeChange?: number | null;
  lastTradePctChange: number | null;
  cumulativeVolume: number | null;
  numberOfTrades: number | null;
  todayOpen?: number | null;
  todayHigh?: number | null;
  todayLow?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
  swingPct?: number;
  pctFrom52High?: number;
  pctFrom52Low?: number;
  spreadPct?: number;
}

export interface MarketStats {
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  totalTrades: number;
  totalValue: number;
  avgChange: number;
  changeDist: {
    up3: number;
    up1to3: number;
    up0to1: number;
    flat: number;
    down0to1: number;
    down1to3: number;
    down3: number;
  };
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
  mostActiveByVolume: MarketMover[];
  mostActiveByTrades: MarketMover[];
  biggestSwings: MarketMover[];
  near52High: MarketMover[];
  near52Low: MarketMover[];
  widestSpreads: MarketMover[];
  tightestSpreads: MarketMover[];
  marketStats: MarketStats;
}
