import { BinaryOrder, ForexPosition, ForexClosedTrade, TradingAccountState, RiskSettings } from '../../src/types/trading.js';
import { AISignalResult, AIProviderConfig } from '../../src/types/ai.js';
import { MarketDataProviderConfig } from '../../src/types/market.js';

class InMemoryStore {
  public account: TradingAccountState = {
    balance: 10000.0,
    currency: 'USD',
    initialBalance: 10000.0,
    equity: 10000.0,
    marginUsed: 0,
    freeMargin: 10000.0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    dailyLossToday: 0,
    maxDailyLoss: 500,
    maxStake: 500,
    maxOpenTrades: 5,
    isBrokerMode: false,
  };

  public riskSettings: RiskSettings = {
    maxStake: 250,
    dailyLossLimit: 500,
    maxOpenPositions: 5,
    defaultTimeframe: '5m',
    defaultPayoutRate: 0.85,
    slippagePips: 0.2,
  };

  public binaryOrders: BinaryOrder[] = [];
  public forexPositions: ForexPosition[] = [];
  public forexClosedTrades: ForexClosedTrade[] = [];
  public aiSignals: AISignalResult[] = [];

  public marketProviders: MarketDataProviderConfig[] = [
    {
      id: 'twelvedata',
      name: 'Twelve Data',
      type: 'twelvedata',
      baseUrl: 'https://api.twelvedata.com',
      wsUrl: 'wss://ws.twelvedata.com/v1/quotes/price',
      isConfigured: false,
      isActive: false,
      docsUrl: 'https://twelvedata.com/docs',
      rateLimitNote: 'Free tier: 8 credits/min, 800/day. Real-time forex data with free key.',
    },
    {
      id: 'finnhub',
      name: 'Finnhub Market API',
      type: 'finnhub',
      baseUrl: 'https://finnhub.io/api/v1',
      wsUrl: 'wss://ws.finnhub.io',
      isConfigured: false,
      isActive: false,
      docsUrl: 'https://finnhub.io/docs/api',
      rateLimitNote: 'Free tier: 30 calls/minute limit. Major forex currency pairs supported.',
    },
    {
      id: 'alphavantage',
      name: 'Alpha Vantage FX',
      type: 'alphavantage',
      baseUrl: 'https://www.alphavantage.co',
      isConfigured: false,
      isActive: false,
      docsUrl: 'https://www.alphavantage.co/documentation/',
      rateLimitNote: 'Free tier: 25 requests/day. Suited for slower interval and historical bars.',
    },
    {
      id: 'realtime_public',
      name: 'Global FX/Crypto Public Feed',
      type: 'binance_public',
      baseUrl: 'https://api.binance.com/api/v3',
      wsUrl: 'wss://stream.binance.com:9443/ws',
      isConfigured: true,
      isActive: true,
      docsUrl: 'https://binance-docs.github.io/apidocs/spot/en/',
      rateLimitNote: 'Free public live quotes and historical OHLC for crypto & currency cross pairs.',
    },
  ];

  public aiProviders: AIProviderConfig[] = [
    {
      id: 'gemini',
      name: 'Google AI Studio Gemini',
      providerType: 'gemini',
      activeModel: 'gemini-3.8-flash',
      availableModels: ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-3.1-flash-lite'],
      isActive: true,
      apiKeySet: Boolean(process.env.GEMINI_API_KEY),
      enableThinking: true,
      rateLimitNote: 'Official Google Gemini models. Supports High Thinking mode with gemini-4-argon.',
      docsUrl: 'https://ai.google.dev/gemini-api/docs',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter Free/Paid Models',
      providerType: 'openrouter',
      activeModel: 'google/gemini-2.0-flash-exp:free',
      availableModels: [
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-r1:free',
      ],
      isActive: false,
      apiKeySet: false,
      enableThinking: false,
      rateLimitNote: 'Free model routes limited to 20 RPM and 50 req/day by OpenRouter policy.',
      docsUrl: 'https://openrouter.ai/docs',
    },
    {
      id: 'groq',
      name: 'Groq Fast LPU Inference',
      providerType: 'groq',
      activeModel: 'llama-3.3-70b-versatile',
      availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
      isActive: false,
      apiKeySet: false,
      enableThinking: false,
      rateLimitNote: 'High speed quantitative inference with free Groq Cloud API account.',
      docsUrl: 'https://console.groq.com/docs',
    },
  ];

  public updateEquity(unrealizedPnl: number) {
    this.account.equity = Number((this.account.balance + unrealizedPnl).toFixed(2));
    this.account.freeMargin = Number((this.account.equity - this.account.marginUsed).toFixed(2));
  }
}

export const db = new InMemoryStore();
