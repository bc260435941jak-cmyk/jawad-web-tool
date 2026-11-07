import { Candle, MarketSymbol, MarketTick, MarketDataProviderConfig, ConnectionResult } from '../types/market.js';
import { AISignalResult, AIProviderConfig, TradingMode } from '../types/ai.js';
import { BinaryOrder, ForexPosition, ForexClosedTrade, TradingAccountState, RiskSettings } from '../types/trading.js';
import { BacktestResult } from '../../server/backtest/backtestEngine.js';
import { EconomicEvent, MarketNewsItem, CurrencyStrength } from '../../server/intel/marketIntel.js';

class ApiClient {
  private authToken: string | null = null;

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || json.message || `Request failed with status ${res.status}`);
    }

    return json.data;
  }

  // Health
  public async getHealth() {
    return this.request<{
      status: string;
      uptime: number;
      activeMarketProvider: string;
      activeAIProvider: string;
      geminiKeyConfigured: boolean;
      isBrokerMode: boolean;
      version: string;
    }>('/api/health');
  }

  // Market
  public async getSymbols(): Promise<MarketSymbol[]> {
    return this.request<MarketSymbol[]>('/api/market/symbols');
  }

  /**
   * Fetches candle data with exponential backoff retry and robust OHLC validation
   */
  public async fetchCandleData(
    symbol: string,
    timeframe: string,
    limit: number = 60,
    maxRetries: number = 3
  ): Promise<{ candles: Candle[]; source: string; status: string }> {
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      try {
        const response = await this.request<{ candles: Candle[]; source: string; status: string }>(
          `/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`
        );

        // Validation layer: verify OHLC data presence and integrity
        if (!response || !Array.isArray(response.candles)) {
          throw new Error('Invalid response structure: missing candles array');
        }

        const validCandles = response.candles.filter((c) => {
          const hasOHLC =
            typeof c.timestamp === 'number' &&
            !isNaN(c.timestamp) &&
            typeof c.open === 'number' &&
            !isNaN(c.open) &&
            typeof c.high === 'number' &&
            !isNaN(c.high) &&
            typeof c.low === 'number' &&
            !isNaN(c.low) &&
            typeof c.close === 'number' &&
            !isNaN(c.close);

          if (!hasOHLC) return false;

          // Check logical OHLC sanity
          const isSanityValid =
            c.high >= c.low &&
            c.high >= Math.min(c.open, c.close) - 0.00001 &&
            c.low <= Math.max(c.open, c.close) + 0.00001;

          return isSanityValid;
        });

        if (validCandles.length === 0 && response.candles.length > 0) {
          throw new Error(`OHLC validation failed: 0 valid candles out of ${response.candles.length} returned`);
        }

        return {
          ...response,
          candles: validCandles,
        };
      } catch (err: any) {
        lastError = err;
        attempt++;
        if (attempt <= maxRetries) {
          const delay = 300 * Math.pow(2, attempt - 1) + Math.random() * 100;
          console.warn(`[apiClient] fetchCandleData attempt ${attempt} failed (${err.message}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[apiClient] fetchCandleData failed after ${maxRetries} retries:`, lastError);
    throw lastError || new Error('Failed to fetch valid candle data');
  }

  public async getCandles(symbol: string, timeframe: string, limit: number = 60): Promise<{ candles: Candle[]; source: string; status: string }> {
    return this.fetchCandleData(symbol, timeframe, limit);
  }

  /**
   * Diagnostic helper to retrieve raw API responses from the market data provider
   */
  public async getRawMarketResponse(symbol: string, timeframe: string, limit: number = 60): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    rawBody: any;
    timestamp: number;
    latencyMs: number;
  }> {
    const url = `/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`;
    const startTime = Date.now();
    const res = await fetch(url);
    const latencyMs = Date.now() - startTime;
    const headersObj: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    let rawBody: any;
    try {
      rawBody = await res.json();
    } catch (e) {
      rawBody = await res.text();
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: headersObj,
      rawBody,
      timestamp: Date.now(),
      latencyMs,
    };
  }

  public async getQuote(symbol: string): Promise<MarketTick> {
    return this.request<MarketTick>(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`);
  }

  public async getMarketProviders(): Promise<MarketDataProviderConfig[]> {
    return this.request<MarketDataProviderConfig[]>('/api/market/providers');
  }

  public async testMarketProvider(providerId: string, apiKey?: string, baseUrl?: string): Promise<ConnectionResult> {
    return this.request<ConnectionResult>('/api/market/providers/test', {
      method: 'POST',
      body: JSON.stringify({ providerId, apiKey, baseUrl }),
    });
  }

  public async setActiveMarketProvider(providerId: string) {
    return this.request<{ activeProviderId: string; name: string }>('/api/market/providers/active', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  }

  public async saveMarketProvider(provider: { id: string; apiKey?: string; baseUrl?: string; wsUrl?: string }) {
    return this.request<{ message: string }>('/api/market/providers', {
      method: 'POST',
      body: JSON.stringify(provider),
    });
  }

  // AI Signals
  public async getSignal(params: {
    symbol: string;
    timeframe: string;
    mode: TradingMode;
    enableThinking?: boolean;
    strategy?: string;
  }): Promise<AISignalResult> {
    return this.request<AISignalResult>('/api/ai/signal', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async getSignalHistory(): Promise<AISignalResult[]> {
    return this.request<AISignalResult[]>('/api/ai/signals');
  }

  public async getAIProviders(): Promise<AIProviderConfig[]> {
    return this.request<AIProviderConfig[]>('/api/ai/providers');
  }

  public async testAIProvider(providerId: string, apiKey?: string): Promise<{ success: boolean; latencyMs: number; message: string; status: string }> {
    return this.request('/api/ai/providers/test', {
      method: 'POST',
      body: JSON.stringify({ providerId, apiKey }),
    });
  }

  public async saveAIProvider(payload: { id: string; name?: string; providerType?: string; activeModel?: string; apiKey?: string }) {
    return this.request('/api/ai/providers/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getAIMonitor(symbol: string, timeframe: string) {
    return this.request<{ symbol: string; timeframe: string; commentary: string; timestamp: number }>(
      `/api/ai/monitor?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`
    );
  }

  public async setActiveAIProvider(providerId: string, modelId?: string) {
    return this.request<{ activeProviderId: string; activeModel: string }>('/api/ai/providers/active', {
      method: 'POST',
      body: JSON.stringify({ providerId, modelId }),
    });
  }

  // Paper Trading
  public async getPaperAccount(): Promise<TradingAccountState> {
    return this.request<TradingAccountState>('/api/paper/account');
  }

  public async getPaperPositions(): Promise<{
    binaryOrders: BinaryOrder[];
    forexPositions: ForexPosition[];
    forexClosedTrades: ForexClosedTrade[];
    account: TradingAccountState;
  }> {
    return this.request<{
      binaryOrders: BinaryOrder[];
      forexPositions: ForexPosition[];
      forexClosedTrades: ForexClosedTrade[];
      account: TradingAccountState;
    }>('/api/paper/positions');
  }

  public async placePaperOrder(payload: {
    orderType: 'binary' | 'forex';
    symbol: string;
    type: 'CALL' | 'PUT' | 'BUY' | 'SELL';
    stake?: number;
    lots?: number;
    durationMinutes?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) {
    return this.request<any>('/api/paper/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async closeForexPosition(positionId: string) {
    return this.request<{ closedTradeId: string; realizedPnl: number }>('/api/paper/positions/close', {
      method: 'POST',
      body: JSON.stringify({ positionId }),
    });
  }

  public async resetPaperAccount() {
    return this.request<TradingAccountState>('/api/paper/reset', {
      method: 'POST',
    });
  }

  // Backtesting
  public async runBacktest(params: {
    symbol: string;
    timeframe: string;
    strategy: string;
    mode: 'binary' | 'forex';
    stakeOrRisk: number;
    payoutRate?: number;
  }): Promise<BacktestResult> {
    return this.request<BacktestResult>('/api/backtest/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Market Intel
  public async getMarketIntel(): Promise<{
    economicCalendar: EconomicEvent[];
    currencyStrength: CurrencyStrength[];
    news: MarketNewsItem[];
  }> {
    return this.request<{
      economicCalendar: EconomicEvent[];
      currencyStrength: CurrencyStrength[];
      news: MarketNewsItem[];
    }>('/api/market/intel');
  }

  // Settings
  public async getSettings(): Promise<{ riskSettings: RiskSettings; account: TradingAccountState }> {
    return this.request<{ riskSettings: RiskSettings; account: TradingAccountState }>('/api/settings');
  }

  public async saveSettings(settings: Partial<RiskSettings>): Promise<RiskSettings> {
    return this.request<RiskSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }
}

export const api = new ApiClient();
