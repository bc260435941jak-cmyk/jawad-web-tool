import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBinaryPayout,
  evaluateBinaryOutcome,
  calculatePips,
  calculateRiskRewardRatio,
  calculatePositionSize,
} from './tradingMath.js';

test('calculateBinaryPayout returns correct win profit and total return', () => {
  const result = calculateBinaryPayout(100, 0.85);
  assert.equal(result.winProfit, 85);
  assert.equal(result.totalReturn, 185);
  assert.equal(result.maxLoss, 100);
});

test('evaluateBinaryOutcome correctly awards CALL win', () => {
  const result = evaluateBinaryOutcome('CALL', 1.0850, 1.0855, 50, 0.90);
  assert.equal(result.status, 'WON');
  assert.equal(result.realizedPnl, 45);
});

test('evaluateBinaryOutcome correctly awards CALL loss', () => {
  const result = evaluateBinaryOutcome('CALL', 1.0850, 1.0845, 50, 0.90);
  assert.equal(result.status, 'LOST');
  assert.equal(result.realizedPnl, -50);
});

test('evaluateBinaryOutcome correctly awards PUT win', () => {
  const result = evaluateBinaryOutcome('PUT', 1.0850, 1.0840, 50, 0.80);
  assert.equal(result.status, 'WON');
  assert.equal(result.realizedPnl, 40);
});

test('calculatePips calculates accurate pip distance for standard and JPY pairs', () => {
  const eurusdPips = calculatePips('EUR/USD', 1.0850, 1.0875);
  assert.equal(eurusdPips, 25);

  const usdjpyPips = calculatePips('USD/JPY', 154.20, 154.60);
  assert.equal(usdjpyPips, 40);
});

test('calculateRiskRewardRatio computes correct ratio for BUY and SELL', () => {
  const buyRR = calculateRiskRewardRatio('BUY', 1.0800, 1.0750, 1.0900);
  // risk = 50 pips, reward = 100 pips -> 2.0
  assert.equal(buyRR, 2.0);

  const sellRR = calculateRiskRewardRatio('SELL', 1.0800, 1.0850, 1.0700);
  // risk = 50 pips, reward = 100 pips -> 2.0
  assert.equal(sellRR, 2.0);
});

test('calculatePositionSize calculates sound lot size given risk percentage', () => {
  const sizing = calculatePositionSize(10000, 1, 1.0800, 1.0750, 'EUR/USD');
  // 1% of 10,000 = $100 risk. 50 pips risk -> 100 / (50 * 10) = 0.20 lots
  assert.equal(sizing.riskAmount, 100);
  assert.equal(sizing.pipsAtRisk, 50);
  assert.equal(sizing.lots, 0.2);
});
