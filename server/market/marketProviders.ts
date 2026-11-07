import { Candle, MarketSymbol, MarketTick, ConnectionResult, Timeframe } from '../../src/types/market.js';
import { db } from '../storage/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Sync environment variables with stored market provider configs on server startup
function syncEnvKeys() {
  const twelveKey = process.env.TWELVEDATA_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const alphaKey = process.env.ALPHAVANTAGE_API_KEY;

  const td = db.marketProviders.find((p) => p.id === 'twelvedata');
  if (td && twelveKey) {
    td.apiKey = twelveKey;
    td.isConfigured = true;
    td.isActive = true;
  }

  const fh = db.marketProviders.find((p) => p.id === 'finnhub');
  if (fh && finnhubKey) {
    fh.apiKey = finnhubKey;
    fh.isConfigured = true;
    if (!td || !twelveKey) fh.isActive = true;
  }

  const av = db.marketProviders.find((p) => p.id === 'alphavantage');
  if (av && alphaKey) {
    av.apiKey = alphaKey;
    av.isConfigured = true;
  }
}

syncEnvKeys();

const FIAT_CURRENCIES = new Set([
  'EUR', 'GBP', 'USD', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
  'DKK', 'SEK', 'NOK', 'SGD', 'HKD', 'TRY', 'ZAR', 'MXN',
  'PLN', 'CZK', 'HUF', 'ILS', 'THB', 'MYR', 'IDR', 'PHP',
  'INR', 'BRL', 'CLP', 'COP', 'KRW', 'CNY', 'XAU', 'XAG',
]);

function isCryptoSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const parts = symbol.split('/');
  const base = parts[0] ? parts[0].toUpperCase() : '';
  if (!base) return false;
  return !FIAT_CURRENCIES.has(base);
}

function getTimeframeMinutes(tf: Timeframe): number {
  switch (tf) {
    case '1m': return 1;
    case '5m': return 5;
    case '15m': return 15;
    case '1h': return 60;
    case '4h': return 240;
    case '1d': return 1440;
    default: return 5;
  }
}

async function fetchWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 400
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const msg = String(error?.message || error);
      const isClientError = msg.includes('403') || msg.includes('401') || msg.includes('400') || msg.includes('404');
      if (attempt > maxRetries || isClientError) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 150;
      console.warn(`Market data fetch attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export class MarketProviderService {
  /**
   * Fetches dynamic list of accessible instruments from the active market provider via API
   * ZERO hardcoded or simulated fallbacks.
   */
  public async getInstruments(): Promise<MarketSymbol[]> {
    syncEnvKeys();
    const activeProvider = db.marketProviders.find((p) => p.isActive) || db.marketProviders[0];

    // 1. Twelve Data API Instrument Discovery
    if (activeProvider.id === 'twelvedata' && activeProvider.apiKey) {
      try {
        const url = `https://api.twelvedata.com/forex_pairs?apikey=${activeProvider.apiKey}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Obsidian-Quant-AI' } });
        if (res.ok) {
          const data = await res.json();
          if (data.data && Array.isArray(data.data)) {
            const fetched: MarketSymbol[] = data.data.slice(0, 60).map((pair: any) => {
              const symbol = pair.symbol.includes('/') ? pair.symbol : `${pair.symbol.slice(0, 3)}/${pair.symbol.slice(3)}`;
              return {
                symbol,
                name: pair.currency_group ? `${pair.currency_base} / ${pair.currency_quote}` : symbol,
                category: 'forex',
                baseAsset: pair.currency_base || symbol.split('/')[0],
                quoteAsset: pair.currency_quote || symbol.split('/')[1] || 'USD',
                pipSize: symbol.includes('JPY') ? 0.01 : 0.0001,
                decimals: symbol.includes('JPY') ? 3 : 5,
                isOpen: true,
              };
            });
            if (fetched.length > 0) return fetched;
          }
        }
      } catch (err) {
        console.warn('Twelve Data forex_pairs fetch error:', err);
      }
    }

    // 2. Finnhub API Instrument Discovery
    if (activeProvider.id === 'finnhub' && activeProvider.apiKey) {
      try {
        const url = `https://finnhub.io/api/v1/forex/symbol?exchange=oanda&token=${activeProvider.apiKey}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Obsidian-Quant-AI' } });
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw)) {
            const fetched: MarketSymbol[] = raw.slice(0, 60).map((item: any) => {
              const symbol = item.displaySymbol || item.symbol.replace('OANDA:', '').replace('_', '/');
              return {
                symbol,
                name: item.description || symbol,
                category: 'forex',
                baseAsset: symbol.split('/')[0] || 'FX',
                quoteAsset: symbol.split('/')[1] || 'USD',
                pipSize: symbol.includes('JPY') ? 0.01 : 0.0001,
                decimals: symbol.includes('JPY') ? 3 : 5,
                isOpen: true,
              };
            });
            if (fetched.length > 0) return fetched;
          }
        }
      } catch (err) {
        console.warn('Finnhub forex symbol fetch error:', err);
      }
    }

    // 3. Binance Public Spot API Instrument Discovery (Public fallback for crypto)
    try {
      const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
      if (res.ok) {
        const data = await res.json();
        if (data.symbols && Array.isArray(data.symbols)) {
          const usdtPairs = data.symbols
            .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
            .slice(0, 40)
            .map((s: any) => {
              const symbol = `${s.baseAsset}/USD`;
              return {
                symbol,
                name: `${s.baseAsset} / US Dollar`,
                category: 'crypto' as const,
                baseAsset: s.baseAsset,
                quoteAsset: 'USD',
                pipSize: s.baseAsset === 'BTC' || s.baseAsset === 'ETH' ? 0.1 : 0.0001,
                decimals: s.baseAsset === 'BTC' ? 2 : 4,
                isOpen: true,
              };
            });
          if (usdtPairs.length > 0) return usdtPairs;
        }
      }
    } catch (err) {
      console.warn('Binance exchangeInfo fetch error:', err);
    }

    return [];
  }

  /**
   * Fetches real candles from active provider with exponential backoff retry and strict validation.
   * ZERO dummy/simulated data generation.
   */
  public async getCandles(symbol: string, timeframe: Timeframe, limit: number = 60): Promise<{ candles: Candle[]; source: string; status: string }> {
    syncEnvKeys();
    const activeProvider = db.marketProviders.find((p) => p.isActive) || db.marketProviders[0];

    // 1. Binance Public Spot Feed (Crypto pairs: LTC/USD, BTC/USD, ETH/USD, SOL/USD, etc.)
    if (isCryptoSymbol(symbol) || activeProvider.id === 'realtime_public') {
      try {
        const binancePair = symbol.replace('/', '').replace('USD', 'USDT');
        const intervalMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
        const interval = intervalMap[timeframe] || '5m';
        const url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${interval}&limit=${limit}`;

        const candles = await fetchWithExponentialBackoff(async () => {
          const res = await fetch(url, { headers: { 'User-Agent': 'Obsidian-Quant-AI' } });
          if (!res.ok) throw new Error(`Binance HTTP status ${res.status}`);
          const raw = await res.json();
          if (!Array.isArray(raw)) throw new Error('Invalid Binance response format');

          return raw.map((k: any) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            source: 'Binance Live Feed',
            symbol,
          })) as Candle[];
        }, 2, 300);

        return { candles, source: 'Binance Live Feed', status: 'LIVE' };
      } catch (err: any) {
        console.warn(`Binance klines request for ${symbol} failed:`, err?.message || err);
      }
    }

    // 2. Twelve Data Provider (Forex / Stocks)
    if (activeProvider.id === 'twelvedata' && activeProvider.apiKey) {
      try {
        const interval = timeframe === '1m' ? '1min' : timeframe === '5m' ? '5min' : timeframe === '15m' ? '15min' : timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1day';
        const cleanSymbol = symbol.replace('/', '');
        const url = `https://api.twelvedata.com/time_series?symbol=${cleanSymbol}&interval=${interval}&outputsize=${limit}&apikey=${activeProvider.apiKey}`;

        const candles = await fetchWithExponentialBackoff(async () => {
          const res = await fetch(url, { headers: { 'User-Agent': 'Obsidian-Quant-AI' } });
          if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
          const data = await res.json();
          if (data.code && data.code >= 400) throw new Error(`Twelve Data API error: ${data.message || 'Unknown error'}`);
          if (!data.values || !Array.isArray(data.values)) throw new Error('Invalid Twelve Data response format');

          return data.values.map((v: any) => ({
            timestamp: new Date(v.datetime).getTime(),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
            volume: v.volume ? parseFloat(v.volume) : null,
            source: 'Twelve Data',
            symbol,
          })).reverse() as Candle[];
        }, 3, 500);

        return { candles, source: 'Twelve Data', status: 'LIVE' };
      } catch (err: any) {
        console.warn('Twelve Data request failed:', err?.message || err);
        return { candles: [], source: 'Twelve Data', status: 'ERROR' };
      }
    }

    // 3. Finnhub Provider (Forex)
    if (activeProvider.id === 'finnhub' && activeProvider.apiKey) {
      try {
        const cleanSymbol = symbol.replace('/', '_');
        const resMap: Record<string, string> = { '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D' };
        const resolution = resMap[timeframe] || '5';
        const nowSec = Math.floor(Date.now() / 1000);
        const tfSec = getTimeframeMinutes(timeframe) * 60;
        const fromSec = nowSec - limit * tfSec;
        const url = `https://finnhub.io/api/v1/forex/candle?symbol=OANDA:${cleanSymbol}&resolution=${resolution}&from=${fromSec}&to=${nowSec}&token=${activeProvider.apiKey}`;

        const candles = await fetchWithExponentialBackoff(async () => {
          const res = await fetch(url, { headers: { 'User-Agent': 'Obsidian-Quant-AI' } });
          if (!res.ok) throw new Error(`Finnhub HTTP status ${res.status}`);
          const data = await res.json();
          if (data.s !== 'ok' || !Array.isArray(data.c)) throw new Error(`Finnhub candle error: ${data.s || 'no data'}`);

          const list: Candle[] = [];
          for (let i = 0; i < data.c.length; i++) {
            list.push({
              timestamp: data.t[i] * 1000,
              open: data.o[i],
              high: data.h[i],
              low: data.l[i],
              close: data.c[i],
              volume: data.v ? data.v[i] : null,
              source: 'Finnhub Market API',
              symbol,
            });
          }
          return list;
        }, 2, 400);

        return { candles, source: 'Finnhub Market API', status: 'LIVE' };
      } catch (err: any) {
        console.warn('Finnhub request failed:', err?.message || err);
        return { candles: [], source: 'Finnhub Market API', status: 'ERROR' };
      }
    }

    // ZERO dummy fallback: if no real API candles can be fetched, return empty array with DISCONNECTED status
    return {
      candles: [],
      source: activeProvider.name,
      status: 'DISCONNECTED',
    };
  }

  /**
   * Fetches latest quote/tick for a symbol strictly from real candle data.
   */
  public async getQuote(symbol: string): Promise<MarketTick> {
    const candlesResult = await this.getCandles(symbol, '1m', 2);
    if (!candlesResult.candles || candlesResult.candles.length === 0) {
      throw new Error(`No real market quote available for ${symbol} from connected provider.`);
    }

    const last = candlesResult.candles[candlesResult.candles.length - 1];
    const prev = candlesResult.candles[0];

    const currentPrice = last.close;
    const pipMult = symbol.includes('JPY') ? 0.01 : symbol.includes('BTC') || symbol.includes('XAU') ? 1.0 : 0.0001;
    const spreadPips = symbol.includes('BTC') ? 2.5 : 1.2;
    const halfSpread = (spreadPips * pipMult) / 2;

    const bid = Number((currentPrice - halfSpread).toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') || symbol.includes('XAU') ? 2 : 5));
    const ask = Number((currentPrice + halfSpread).toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') || symbol.includes('XAU') ? 2 : 5));
    const change24h = prev ? Number((((currentPrice - prev.open) / prev.open) * 100).toFixed(2)) : 0;

    return {
      symbol,
      price: currentPrice,
      bid,
      ask,
      spread: Number((spreadPips).toFixed(1)),
      timestamp: Date.now(),
      high24h: last.high,
      low24h: last.low,
      change24h,
      source: candlesResult.source,
    };
  }

  /**
   * Tests connection to a market provider
   */
  public async testProvider(providerId: string, apiKey?: string): Promise<ConnectionResult> {
    const start = Date.now();
    try {
      if (providerId === 'twelvedata') {
        const key = apiKey || process.env.TWELVEDATA_API_KEY;
        if (!key) {
          return {
            success: false,
            latencyMs: 0,
            message: 'API Key is required to connect to Twelve Data Forex endpoints',
            endpoint: 'https://api.twelvedata.com',
            timestamp: Date.now(),
          };
        }
        const res = await fetch(`https://api.twelvedata.com/stocks?country=US&apikey=${key}`);
        const latency = Date.now() - start;
        const data = await res.json();
        if (data.code && data.code >= 400) {
          return {
            success: false,
            latencyMs: latency,
            message: `Twelve Data error: ${data.message || 'Authentication failed'}`,
            endpoint: 'https://api.twelvedata.com',
            timestamp: Date.now(),
          };
        }
        return {
          success: true,
          latencyMs: latency,
          message: 'Connected to Twelve Data API successfully',
          endpoint: 'https://api.twelvedata.com',
          timestamp: Date.now(),
          planLimitInfo: '8 credits/min (Free plan)',
        };
      }

      if (providerId === 'finnhub') {
        const key = apiKey || process.env.FINNHUB_API_KEY;
        if (!key) {
          return {
            success: false,
            latencyMs: 0,
            message: 'API Key is required for Finnhub',
            endpoint: 'https://finnhub.io/api/v1',
            timestamp: Date.now(),
          };
        }
        const res = await fetch(`https://finnhub.io/api/v1/forex/symbol?exchange=oanda&token=${key}`);
        const latency = Date.now() - start;
        if (!res.ok) {
          return {
            success: false,
            latencyMs: latency,
            message: `Finnhub returned HTTP status ${res.status}`,
            endpoint: 'https://finnhub.io/api/v1',
            timestamp: Date.now(),
          };
        }
        return {
          success: true,
          latencyMs: latency,
          message: 'Connected to Finnhub Forex feed successfully',
          endpoint: 'https://finnhub.io/api/v1',
          timestamp: Date.now(),
          planLimitInfo: '30 calls/minute limit',
        };
      }

      // Default real-time public feed ping
      const res = await fetch('https://api.binance.com/api/v3/ping');
      const latency = Date.now() - start;
      return {
        success: res.ok,
        latencyMs: latency,
        message: 'Public Institutional Market Stream is active and reachable',
        endpoint: 'https://api.binance.com',
        timestamp: Date.now(),
        planLimitInfo: 'Unlimited public ticker / kline streaming',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `Connection failed: ${err.message || 'Network timeout'}`,
        endpoint: 'provider-test',
        timestamp: Date.now(),
      };
    }
  }
}

export const marketService = new MarketProviderService();

