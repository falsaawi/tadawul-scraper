export interface StockRecordInput {
  symbol: string;
  companyName: string;
  week52High: number | null;
  week52Low: number | null;
  lastTradePrice: number | null;
  lastTradeVolume: number | null;
  lastTradeChange: number | null;
  lastTradePctChange: number | null;
  numberOfTrades: number | null;
  cumulativeVolume: number | null;
  todayOpen: number | null;
  todayHigh: number | null;
  todayLow: number | null;
  bestBidPrice: number | null;
  bestBidQuantity: number | null;
  bestOfferPrice: number | null;
  bestOfferQuantity: number | null;
}

export interface ScrapeResult {
  success: boolean;
  records: StockRecordInput[];
  error?: string;
}

export interface ScrapeSessionInfo {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  error: string | null;
  rowCount: number;
}
