import { Candle } from '../types/market.js';
import { TechnicalIndicators } from '../types/ai.js';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / period).toFixed(5));
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(5));
}

/**
 * Calculates Relative Strength Index (RSI 14)
 */
export function calculateRSI(closes: number[], period: number = 14): number | null {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Number(rsi.toFixed(2));
}

/**
 * Calculates MACD (Moving Average Convergence Divergence) with 12, 26, 9
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < slowPeriod + signalPeriod) return null;

  const macdLine: number[] = [];
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);

  let fastEma = closes.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  let slowEma = closes.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;

  for (let i = slowPeriod; i < closes.length; i++) {
    fastEma = closes[i] * kFast + fastEma * (1 - kFast);
    slowEma = closes[i] * kSlow + slowEma * (1 - kSlow);
    macdLine.push(fastEma - slowEma);
  }

  if (macdLine.length < signalPeriod) return null;

  const kSignal = 2 / (signalPeriod + 1);
  let signalEma = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signalEma = macdLine[i] * kSignal + signalEma * (1 - kSignal);
  }

  const latestMacd = macdLine[macdLine.length - 1];
  const histogram = latestMacd - signalEma;

  return {
    macd: Number(latestMacd.toFixed(5)),
    signal: Number(signalEma.toFixed(5)),
    histogram: Number(histogram.toFixed(5)),
  };
}

/**
 * Calculates Average True Range (ATR 14)
 */
export function calculateATR(candles: Candle[], period: number = 14): number | null {
  if (candles.length <= period) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return Number(atr.toFixed(5));
}

/**
 * Calculates Bollinger Bands (20 period, 2 std dev)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const slice = closes.slice(closes.length - period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;

  const variance = slice.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: Number((sma + multiplier * stdDev).toFixed(5)),
    middle: Number(sma.toFixed(5)),
    lower: Number((sma - multiplier * stdDev).toFixed(5)),
  };
}

/**
 * Identifies Key Support and Resistance levels from recent swing highs/lows
 */
export function calculateSupportResistance(candles: Candle[], lookback: number = 30): {
  support: number;
  resistance: number;
} {
  const recent = candles.slice(-lookback);
  let minLow = Infinity;
  let maxHigh = -Infinity;

  for (const c of recent) {
    if (c.low < minLow) minLow = c.low;
    if (c.high > maxHigh) maxHigh = c.high;
  }

  return {
    support: Number(minLow.toFixed(5)),
    resistance: Number(maxHigh.toFixed(5)),
  };
}

/**
 * Aggregates all technical indicators from raw candles
 */
export function computeTechnicalIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const rsi = calculateRSI(closes, 14);
  const sma20 = calculateSMA(closes, 20);
  const ema20 = calculateEMA(closes, 20);
  const macd = calculateMACD(closes);
  const atr = calculateATR(candles, 14);
  const bb = calculateBollingerBands(closes, 20, 2);
  const { support, resistance } = calculateSupportResistance(candles, 25);

  let trend: 'UPTREND' | 'DOWNTREND' | 'RANGING' = 'RANGING';
  if (closes.length >= 20 && sma20 && ema20) {
    const latest = closes[closes.length - 1];
    if (latest > ema20 && ema20 > sma20) {
      trend = 'UPTREND';
    } else if (latest < ema20 && ema20 < sma20) {
      trend = 'DOWNTREND';
    }
  }

  return {
    rsi14: rsi,
    sma20,
    ema20,
    macd,
    atr14: atr,
    bollingerBands: bb,
    supportLevel: support,
    resistanceLevel: resistance,
    trend,
  };
}
