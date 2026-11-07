export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface MarketSymbol {
  symbol: string;
  name: string;
  category: 'forex' | 'crypto' | 'commodity';
  baseAsset: string;
  quoteAsset: string;
  pipSize: number;
  decimals: number;
  isOpen: boolean;
  minStake?: number;
  maxStake?: number;
}

export interface Candle {
  timestamp: number; // UTC epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: string;
  symbol: string;
}

export interface MarketTick {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  spread?: number;
  timestamp: number;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  source: string;
}

export interface ConnectionResult {
  success: boolean;
  latencyMs: number;
  message: string;
  endpoint: string;
  timestamp: number;
  planLimitInfo?: string;
}

export interface MarketDataProviderConfig {
  id: string;
  name: string;
  type: 'twelvedata' | 'finnhub' | 'alphavantage' | 'binance_public' | 'frankfurter' | 'custom_rest';
  baseUrl: string;
  wsUrl?: string;
  apiKey?: string;
  isConfigured: boolean;
  isActive: boolean;
  docsUrl: string;
  rateLimitNote: string;
  lastTestResult?: ConnectionResult;
}
