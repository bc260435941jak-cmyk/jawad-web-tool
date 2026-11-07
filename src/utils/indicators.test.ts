import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  computeTechnicalIndicators,
} from './indicators.js';
import { Candle } from '../types/market.js';

test('calculateSMA computes simple moving average accurately', () => {
  const prices = [10, 20, 30, 40, 50];
  const sma3 = calculateSMA(prices, 3);
  // (30 + 40 + 50) / 3 = 40
  assert.equal(sma3, 40);
});

test('calculateEMA produces smooth trend following', () => {
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const ema5 = calculateEMA(prices, 5);
  assert.ok(ema5 !== null && ema5 > 15 && ema5 <= 20);
});

test('calculateRSI identifies overbought conditions', () => {
  // Rising series of 20 prices
  const risingPrices = Array.from({ length: 25 }, (_, i) => 1.0500 + i * 0.0020);
  const rsi = calculateRSI(risingPrices, 14);
  assert.ok(rsi !== null && rsi > 70, `RSI should be overbought, got ${rsi}`);
});

test('calculateRSI identifies oversold conditions', () => {
  // Falling series of 25 prices
  const fallingPrices = Array.from({ length: 25 }, (_, i) => 1.1000 - i * 0.0020);
  const rsi = calculateRSI(fallingPrices, 14);
  assert.ok(rsi !== null && rsi < 30, `RSI should be oversold, got ${rsi}`);
});

test('calculateBollingerBands returns upper, middle, and lower bands', () => {
  const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
  const bb = calculateBollingerBands(prices, 20, 2);
  assert.ok(bb !== null);
  assert.ok(bb.upper > bb.middle);
  assert.ok(bb.middle > bb.lower);
});

test('computeTechnicalIndicators extracts all features without NaN', () => {
  const sampleCandles: Candle[] = Array.from({ length: 45 }, (_, i) => {
    const base = 1.0800 + i * 0.0003 + Math.sin(i / 2) * 0.0005;
    return {
      timestamp: 1700000000000 + i * 60000,
      open: base,
      high: base + 0.0008,
      low: base - 0.0006,
      close: base + 0.0002,
      volume: 1200 + i * 10,
      source: 'test-provider',
      symbol: 'EUR/USD',
    };
  });

  const ind = computeTechnicalIndicators(sampleCandles);
  assert.ok(ind.rsi14 !== null);
  assert.ok(ind.sma20 !== null);
  assert.ok(ind.ema20 !== null);
  assert.ok(ind.macd !== null);
  assert.ok(ind.bollingerBands !== null);
  assert.ok(['UPTREND', 'DOWNTREND', 'RANGING'].includes(ind.trend));
});
