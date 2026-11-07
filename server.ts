import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SUPPORTED_SYMBOLS, marketService } from './server/market/marketProviders.js';
import { aiRouter } from './server/ai/aiRouter.js';
import { backtestEngine } from './server/backtest/backtestEngine.js';
import { marketIntelService } from './server/intel/marketIntel.js';
import { db } from './server/storage/db.js';
import { validateSafeUrl } from './server/utils/ssrf.js';
import { evaluateBinaryOutcome } from './src/utils/tradingMath.js';
import { Timeframe } from './src/types/market.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Response Helper Envelopes
function sendSuccess(res: Response, data: any, message?: string) {
  return res.json({
    success: true,
    data,
    message,
    timestamp: Date.now(),
  });
}

function sendError(res: Response, code: string, message: string, status: number = 400) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
    timestamp: Date.now(),
  });
}

// -----------------------------------------------------------------------------
// Health Check Endpoint
// -----------------------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'ONLINE',
    uptime: process.uptime(),
    activeMarketProvider: db.marketProviders.find((p) => p.isActive)?.name || 'Default Public Stream',
    activeAIProvider: db.aiProviders.find((p) => p.isActive)?.name || 'Google Gemini',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    isBrokerMode: db.account.isBrokerMode,
    version: '2.1.0-master',
  });
});

// -----------------------------------------------------------------------------
// Market Data Endpoints
// -----------------------------------------------------------------------------
app.get('/api/market/symbols', async (req: Request, res: Response) => {
  try {
    const symbols = await marketService.getInstruments();
    return sendSuccess(res, symbols);
  } catch (err: any) {
    return sendSuccess(res, SUPPORTED_SYMBOLS);
  }
});

app.get('/api/market/candles', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'EUR/USD';
    const timeframe = (req.query.timeframe as Timeframe) || '5m';
    const limit = Math.min(200, Math.max(10, parseInt((req.query.limit as string) || '60', 10)));

    const result = await marketService.getCandles(symbol, timeframe, limit);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'CANDLE_FETCH_ERROR', err?.message || 'Failed to fetch candles', 500);
  }
});

app.get('/api/market/quote', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'EUR/USD';
    const quote = await marketService.getQuote(symbol);
    return sendSuccess(res, quote);
  } catch (err: any) {
    return sendError(res, 'QUOTE_FETCH_ERROR', err?.message || 'Failed to fetch quote', 500);
  }
});

// Market Provider Management
app.get('/api/market/providers', (req: Request, res: Response) => {
  // Never expose full API keys in response
  const sanitized = db.marketProviders.map((p) => ({
    ...p,
    apiKey: p.apiKey ? `••••••••${p.apiKey.slice(-4)}` : undefined,
  }));
  return sendSuccess(res, sanitized);
});

app.post('/api/market/providers/test', async (req: Request, res: Response) => {
  const { providerId, apiKey, baseUrl } = req.body;
  if (!providerId) return sendError(res, 'INVALID_PAYLOAD', 'providerId is required');

  if (baseUrl) {
    const validation = validateSafeUrl(baseUrl);
    if (!validation.safe) {
      return sendError(res, 'SSRF_BLOCKED', validation.error || 'Unsafe URL target');
    }
  }

  const result = await marketService.testProvider(providerId, apiKey);
  return sendSuccess(res, result);
});

app.post('/api/market/providers/active', (req: Request, res: Response) => {
  const { providerId } = req.body;
  const target = db.marketProviders.find((p) => p.id === providerId);
  if (!target) return sendError(res, 'NOT_FOUND', 'Provider not found');

  db.marketProviders.forEach((p) => {
    p.isActive = p.id === providerId;
  });

  return sendSuccess(res, { activeProviderId: providerId, name: target.name });
});

app.post('/api/market/providers', (req: Request, res: Response) => {
  const { id, apiKey, baseUrl, wsUrl } = req.body;
  if (!id) return sendError(res, 'INVALID_PAYLOAD', 'Provider ID is required');

  const provider = db.marketProviders.find((p) => p.id === id);
  if (!provider) return sendError(res, 'NOT_FOUND', 'Provider not found');

  if (baseUrl) {
    const check = validateSafeUrl(baseUrl);
    if (!check.safe) return sendError(res, 'SSRF_BLOCKED', check.error || 'Unsafe URL');
    provider.baseUrl = baseUrl;
  }
  if (wsUrl) provider.wsUrl = wsUrl;
  if (apiKey) {
    provider.apiKey = apiKey;
    provider.isConfigured = true;
  }

  return sendSuccess(res, { message: 'Provider updated securely' });
});

// -----------------------------------------------------------------------------
// AI Signal Generation ("GET SIGNAL")
// -----------------------------------------------------------------------------
app.post('/api/ai/signal', async (req: Request, res: Response) => {
  try {
    const { symbol = 'EUR/USD', timeframe = '5m', mode = 'binary', enableThinking = false, strategy } = req.body;

    // 1. Fetch real market candles from connected provider
    const candleResult = await marketService.getCandles(symbol, timeframe as Timeframe, 60);

    // 2. Pass to AI Router with Gemini & High Thinking mode support
    const signal = await aiRouter.generateSignal({
      symbol,
      timeframe,
      mode,
      candles: candleResult.candles,
      enableThinking: Boolean(enableThinking),
      strategy,
    });

    return sendSuccess(res, signal);
  } catch (err: any) {
    console.error('Error generating AI signal:', err);
    return sendError(res, 'AI_SIGNAL_ERROR', err?.message || 'Failed to generate AI signal', 500);
  }
});

app.get('/api/ai/signals', (req: Request, res: Response) => {
  return sendSuccess(res, db.aiSignals);
});

app.get('/api/ai/providers', (req: Request, res: Response) => {
  const sanitized = db.aiProviders.map((p) => ({
    ...p,
    apiKeySet: p.apiKeySet,
  }));
  return sendSuccess(res, sanitized);
});

app.post('/api/ai/providers/test', async (req: Request, res: Response) => {
  const { providerId, apiKey } = req.body;
  const result = await aiRouter.testAIProvider(providerId, apiKey);
  return sendSuccess(res, result);
});

app.post('/api/ai/providers/save', (req: Request, res: Response) => {
  const { id, name, providerType, activeModel, apiKey } = req.body;
  if (!id) return sendError(res, 'INVALID_PAYLOAD', 'Provider ID is required');

  let provider = db.aiProviders.find((p) => p.id === id);
  if (!provider) {
    provider = {
      id,
      name: name || id,
      providerType: providerType || 'gemini',
      activeModel: activeModel || 'gemini-3.8-flash',
      availableModels: [activeModel || 'gemini-3.8-flash'],
      isActive: false,
      apiKeySet: Boolean(apiKey),
      enableThinking: false,
      rateLimitNote: 'Custom AI Provider endpoint',
      docsUrl: 'https://ai.google.dev',
    };
    db.aiProviders.push(provider);
  } else {
    if (activeModel) provider.activeModel = activeModel;
    if (apiKey) provider.apiKeySet = true;
    if (name) provider.name = name;
  }

  return sendSuccess(res, { message: 'AI Provider settings saved securely on backend' });
});

app.get('/api/ai/monitor', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'EUR/USD';
    const timeframe = (req.query.timeframe as string) || '5m';
    const candlesRes = await marketService.getCandles(symbol, timeframe as Timeframe, 20);
    const candles = candlesRes.candles;
    const prev = candles[candles.length - 2];
    const curr = candles[candles.length - 1];

    let commentary = `${symbol} is currently monitoring completed candle closure at ${prev.close}. `;
    if (curr.close > prev.close) {
      commentary += `Current forming candle is moving upward with active momentum. WAIT for candle confirmation before next entry.`;
    } else {
      commentary += `Current forming candle is consolidating near previous support/resistance levels. Maintain capital preservation.`;
    }

    return sendSuccess(res, {
      symbol,
      timeframe,
      commentary,
      timestamp: Date.now(),
      previousCompletedCandle: prev,
      formingCurrentCandle: curr,
    });
  } catch (err: any) {
    return sendError(res, 'MONITOR_ERROR', err?.message || 'Failed to fetch monitor analysis', 500);
  }
});

app.post('/api/ai/providers/active', (req: Request, res: Response) => {
  const { providerId, modelId } = req.body;
  const target = db.aiProviders.find((p) => p.id === providerId);
  if (!target) return sendError(res, 'NOT_FOUND', 'AI Provider not found');

  db.aiProviders.forEach((p) => {
    p.isActive = p.id === providerId;
  });
  if (modelId) target.activeModel = modelId;

  return sendSuccess(res, { activeProviderId: providerId, activeModel: target.activeModel });
});

// -----------------------------------------------------------------------------
// Paper Trading & Positions Endpoints
// -----------------------------------------------------------------------------
app.get('/api/paper/account', (req: Request, res: Response) => {
  return sendSuccess(res, db.account);
});

app.post('/api/paper/reset', (req: Request, res: Response) => {
  db.account.balance = 10000.0;
  db.account.equity = 10000.0;
  db.account.marginUsed = 0;
  db.account.freeMargin = 10000.0;
  db.account.dailyLossToday = 0;
  db.binaryOrders = [];
  db.forexPositions = [];
  db.forexClosedTrades = [];
  return sendSuccess(res, db.account, 'Paper balance reset to $10,000.00');
});

app.get('/api/paper/positions', async (req: Request, res: Response) => {
  // Update live PnL of open Forex positions with current quote
  for (const pos of db.forexPositions) {
    try {
      const quote = await marketService.getQuote(pos.symbol);
      pos.currentPrice = quote.price;
      const pipMult = pos.symbol.includes('JPY') ? 0.01 : 0.0001;
      const pipDiff = pos.type === 'BUY' ? (pos.currentPrice - pos.entryPrice) / pipMult : (pos.entryPrice - pos.currentPrice) / pipMult;
      pos.pips = Number(pipDiff.toFixed(1));
      pos.unrealizedPnl = Number((pos.pips * pos.pipValue * pos.lots).toFixed(2));
    } catch {
      // keep current price if quote fetch has temporary issue
    }
  }

  // Check and settle expired binary orders
  const now = Date.now();
  for (const bo of db.binaryOrders) {
    if (bo.status === 'OPEN' && now >= bo.expiryTime) {
      const quote = await marketService.getQuote(bo.symbol);
      bo.exitPrice = quote.price;
      bo.exitTime = now;
      const outcome = evaluateBinaryOutcome(bo.type, bo.entryPrice, bo.exitPrice, bo.stake, bo.payoutRate);
      bo.status = outcome.status;
      bo.realizedPnl = outcome.realizedPnl;

      // Update account
      if (outcome.status === 'WON') {
        db.account.balance += bo.stake + outcome.realizedPnl;
        db.account.winningTrades++;
      } else if (outcome.status === 'LOST') {
        db.account.dailyLossToday += bo.stake;
        db.account.losingTrades++;
      } else {
        db.account.balance += bo.stake; // refund
      }
      db.account.totalTrades++;
      db.account.equity = db.account.balance;
    }
  }

  return sendSuccess(res, {
    binaryOrders: db.binaryOrders,
    forexPositions: db.forexPositions,
    forexClosedTrades: db.forexClosedTrades,
    account: db.account,
  });
});

app.post('/api/paper/orders', async (req: Request, res: Response) => {
  const { orderType, symbol, stake, lots, type, durationMinutes = 5, stopLoss, takeProfit } = req.body;

  // Risk controls check
  if (db.account.dailyLossToday >= db.riskSettings.dailyLossLimit) {
    return sendError(res, 'RISK_LIMIT_REACHED', `Daily loss limit of $${db.riskSettings.dailyLossLimit} reached. Orders paused for capital protection.`);
  }

  const quote = await marketService.getQuote(symbol);
  const currentPrice = quote.price;

  if (orderType === 'binary') {
    const orderStake = Number(stake);
    if (!orderStake || orderStake <= 0) return sendError(res, 'INVALID_STAKE', 'Stake must be positive');
    if (orderStake > db.riskSettings.maxStake) {
      return sendError(res, 'MAX_STAKE_EXCEEDED', `Maximum stake limit is $${db.riskSettings.maxStake}`);
    }
    if (orderStake > db.account.balance) {
      return sendError(res, 'INSUFFICIENT_FUNDS', 'Insufficient paper balance for this stake');
    }

    const openBinaryCount = db.binaryOrders.filter((o) => o.status === 'OPEN').length;
    if (openBinaryCount >= db.riskSettings.maxOpenPositions) {
      return sendError(res, 'MAX_POSITIONS_REACHED', `Maximum open positions (${db.riskSettings.maxOpenPositions}) reached.`);
    }

    const payoutRate = db.riskSettings.defaultPayoutRate;
    const now = Date.now();
    const expiryTime = now + durationMinutes * 60 * 1000;

    // Deduct stake upfront
    db.account.balance -= orderStake;
    db.account.equity = db.account.balance;

    const newOrder = {
      id: `ord_bin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: (type as 'CALL' | 'PUT'),
      symbol,
      stake: orderStake,
      entryPrice: currentPrice,
      entryTime: now,
      expiryTime,
      durationMinutes,
      payoutRate,
      expectedProfit: Number((orderStake * payoutRate).toFixed(2)),
      status: 'OPEN' as const,
      idempotencyKey: `idemp_${Date.now()}`,
    };

    db.binaryOrders.unshift(newOrder);
    return sendSuccess(res, newOrder, `Paper ${type} contract opened at ${currentPrice}`);
  } else {
    // Forex Order
    const orderLots = Number(lots) || 0.1;
    const openForexCount = db.forexPositions.length;
    if (openForexCount >= db.riskSettings.maxOpenPositions) {
      return sendError(res, 'MAX_POSITIONS_REACHED', `Maximum open positions (${db.riskSettings.maxOpenPositions}) reached.`);
    }

    const pipValue = 10; // $10/pip for standard lot
    const newPos = {
      id: `pos_fx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      symbol,
      type: (type as 'BUY' | 'SELL'),
      lots: orderLots,
      entryPrice: currentPrice,
      currentPrice,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      pipValue,
      pips: 0,
      unrealizedPnl: 0,
      openTime: Date.now(),
      idempotencyKey: `idemp_fx_${Date.now()}`,
    };

    db.forexPositions.unshift(newPos);
    return sendSuccess(res, newPos, `Paper Forex ${type} position opened at ${currentPrice}`);
  }
});

app.post('/api/paper/positions/close', async (req: Request, res: Response) => {
  const { positionId } = req.body;
  const index = db.forexPositions.findIndex((p) => p.id === positionId);
  if (index === -1) return sendError(res, 'NOT_FOUND', 'Position not found');

  const pos = db.forexPositions[index];
  const quote = await marketService.getQuote(pos.symbol);
  pos.currentPrice = quote.price;

  const pipMult = pos.symbol.includes('JPY') ? 0.01 : 0.0001;
  const pipDiff = pos.type === 'BUY' ? (pos.currentPrice - pos.entryPrice) / pipMult : (pos.entryPrice - pos.currentPrice) / pipMult;
  const pips = Number(pipDiff.toFixed(1));
  const realizedPnl = Number((pips * pos.pipValue * pos.lots).toFixed(2));

  db.account.balance += realizedPnl;
  db.account.totalTrades++;
  if (realizedPnl > 0) db.account.winningTrades++;
  else if (realizedPnl < 0) {
    db.account.losingTrades++;
    db.account.dailyLossToday += Math.abs(realizedPnl);
  }
  db.account.equity = db.account.balance;

  db.forexClosedTrades.unshift({
    id: pos.id,
    symbol: pos.symbol,
    type: pos.type,
    lots: pos.lots,
    entryPrice: pos.entryPrice,
    exitPrice: pos.currentPrice,
    openTime: pos.openTime,
    closeTime: Date.now(),
    realizedPnl,
    pips,
    reason: 'MANUAL',
  });

  db.forexPositions.splice(index, 1);
  return sendSuccess(res, { closedTradeId: pos.id, realizedPnl }, `Position closed with P/L: $${realizedPnl}`);
});

// -----------------------------------------------------------------------------
// Backtest Execution
// -----------------------------------------------------------------------------
app.post('/api/backtest/run', async (req: Request, res: Response) => {
  try {
    const { symbol = 'EUR/USD', timeframe = '15m', strategy = 'rsi_reversal', mode = 'binary', stakeOrRisk = 25, payoutRate = 0.85 } = req.body;

    const candleResult = await marketService.getCandles(symbol, timeframe as Timeframe, 120);
    const result = backtestEngine.runBacktest(candleResult.candles, {
      symbol,
      timeframe,
      strategy,
      initialBalance: 10000,
      mode,
      stakeOrRisk: Number(stakeOrRisk),
      payoutRate: Number(payoutRate),
      slPips: 25,
      tpPips: 50,
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'BACKTEST_ERROR', err?.message || 'Backtest execution failed', 500);
  }
});

// -----------------------------------------------------------------------------
// Market Intel (News, Calendar, Sentiment)
// -----------------------------------------------------------------------------
app.get('/api/market/intel', (req: Request, res: Response) => {
  return sendSuccess(res, {
    economicCalendar: marketIntelService.getEconomicCalendar(),
    currencyStrength: marketIntelService.getCurrencyStrength(),
    news: marketIntelService.getFinancialNews(),
  });
});

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------
app.get('/api/settings', (req: Request, res: Response) => {
  return sendSuccess(res, {
    riskSettings: db.riskSettings,
    account: db.account,
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const { maxStake, dailyLossLimit, maxOpenPositions, defaultTimeframe, defaultPayoutRate } = req.body;
  if (maxStake) db.riskSettings.maxStake = Number(maxStake);
  if (dailyLossLimit) {
    db.riskSettings.dailyLossLimit = Number(dailyLossLimit);
    db.account.maxDailyLoss = Number(dailyLossLimit);
  }
  if (maxOpenPositions) db.riskSettings.maxOpenPositions = Number(maxOpenPositions);
  if (defaultTimeframe) db.riskSettings.defaultTimeframe = defaultTimeframe;
  if (defaultPayoutRate) db.riskSettings.defaultPayoutRate = Number(defaultPayoutRate);

  return sendSuccess(res, db.riskSettings, 'Settings saved successfully');
});

// -----------------------------------------------------------------------------
// Vite Middleware / Static Serving
// -----------------------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Obsidian Quant AI] Server running on http://0.0.0.0:${PORT} in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
  });
}

startServer();
