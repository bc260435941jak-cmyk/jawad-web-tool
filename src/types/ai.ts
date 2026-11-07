export type SignalDirection = 'BUY' | 'SELL' | 'WAIT';
export type SignalStatus = 'STRONG' | 'CONDITIONAL' | 'WAIT' | 'REJECTED';
export type TradingMode = 'binary' | 'forex';

export interface TechnicalIndicators {
  rsi14: number | null;
  sma20: number | null;
  ema20: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  atr14: number | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  supportLevel?: number;
  resistanceLevel?: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
}

export interface AISignalResult {
  id: string;
  symbol: string;
  timeframe: string;
  mode: TradingMode;
  direction: SignalDirection;
  status: SignalStatus;
  confidence: number; // 0 to 100 model-reported confidence
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  expiryMinutes?: number;
  riskRewardRatio?: number;
  reasoning: string[];
  invalidation_conditions: string[];
  risk_notes: string[];
  data_timestamp: string;
  generated_at: number;
  model_id: string;
  provider_source: string;
  indicators: TechnicalIndicators;
  thinkingProcess?: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  providerType: 'gemini' | 'openrouter' | 'groq' | 'mistral';
  activeModel: string;
  availableModels: string[];
  isActive: boolean;
  apiKeySet: boolean;
  enableThinking: boolean;
  rateLimitNote: string;
  docsUrl: string;
  lastTestResult?: {
    success: boolean;
    latencyMs: number;
    message: string;
    timestamp: number;
  };
}
