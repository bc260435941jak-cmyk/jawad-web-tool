export interface BinaryOrder {
  id: string;
  type: 'CALL' | 'PUT';
  symbol: string;
  stake: number;
  entryPrice: number;
  entryTime: number;
  expiryTime: number;
  durationMinutes: number;
  payoutRate: number; // e.g., 0.85 (85%)
  expectedProfit: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'TIED';
  exitPrice?: number;
  exitTime?: number;
  realizedPnl?: number;
  idempotencyKey: string;
}

export interface ForexPosition {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pipValue: number;
  pips: number;
  unrealizedPnl: number;
  openTime: number;
  idempotencyKey: string;
}

export interface ForexClosedTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  exitPrice: number;
  openTime: number;
  closeTime: number;
  realizedPnl: number;
  pips: number;
  reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL';
}

export interface TradingAccountState {
  balance: number;
  currency: string;
  initialBalance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  dailyLossToday: number;
  maxDailyLoss: number;
  maxStake: number;
  maxOpenTrades: number;
  isBrokerMode: boolean; // Always false by default in paper trading
}

export interface RiskSettings {
  maxStake: number;
  dailyLossLimit: number;
  maxOpenPositions: number;
  defaultTimeframe: string;
  defaultPayoutRate: number;
  slippagePips: number;
}
