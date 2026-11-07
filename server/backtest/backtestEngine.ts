import { Candle } from '../../src/types/market.js';
import { calculateRSI, calculateSMA, calculateEMA, calculateMACD, calculateBollingerBands } from '../../src/utils/indicators.js';

export interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategy: 'rsi_reversal' | 'ema_crossover' | 'macd_trend' | 'bollinger_bounce';
  initialBalance: number;
  mode: 'binary' | 'forex';
  stakeOrRisk: number; // $ stake for binary, or % risk per trade for forex
  payoutRate?: number; // e.g. 0.85 for binary
  slPips?: number;
  tpPips?: number;
}

export interface BacktestTrade {
  tradeNumber: number;
  entryTime: string;
  exitTime: string;
  type: 'CALL' | 'PUT' | 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  balanceAfter: number;
  status: 'WIN' | 'LOSS';
  reason: string;
}

export interface BacktestResult {
  params: BacktestParams;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage e.g. 64.5%
  netProfit: number;
  netProfitPercent: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  expectancy: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: { time: string; balance: number }[];
}

export class BacktestEngine {
  public runBacktest(candles: Candle[], params: BacktestParams): BacktestResult {
    let currentBalance = params.initialBalance;
    const trades: BacktestTrade[] = [];
    const equityCurve: { time: string; balance: number }[] = [
      { time: new Date(candles[0].timestamp).toISOString().split('T')[0], balance: currentBalance },
    ];

    let grossProfit = 0;
    let grossLoss = 0;
    let peakBalance = currentBalance;
    let maxDrawdown = 0;

    const closes = candles.map((c) => c.close);
    const warmup = 30;

    for (let i = warmup; i < candles.length - 2; i++) {
      const pastCloses = closes.slice(0, i + 1); // Strictly no look-ahead bias!
      const currentCandle = candles[i];
      const nextCandle = candles[i + 1];

      let signal: 'BUY' | 'SELL' | null = null;
      let reason = '';

      if (params.strategy === 'rsi_reversal') {
        const rsi = calculateRSI(pastCloses, 14);
        if (rsi !== null) {
          if (rsi < 30) {
            signal = 'BUY';
            reason = `RSI oversold at ${rsi.toFixed(1)}`;
          } else if (rsi > 70) {
            signal = 'SELL';
            reason = `RSI overbought at ${rsi.toFixed(1)}`;
          }
        }
      } else if (params.strategy === 'ema_crossover') {
        const emaFast = calculateEMA(pastCloses, 9);
        const emaSlow = calculateEMA(pastCloses, 21);
        const prevCloses = closes.slice(0, i);
        const prevFast = calculateEMA(prevCloses, 9);
        const prevSlow = calculateEMA(prevCloses, 21);

        if (emaFast && emaSlow && prevFast && prevSlow) {
          if (prevFast <= prevSlow && emaFast > emaSlow) {
            signal = 'BUY';
            reason = 'EMA-9 crossed above EMA-21';
          } else if (prevFast >= prevSlow && emaFast < emaSlow) {
            signal = 'SELL';
            reason = 'EMA-9 crossed below EMA-21';
          }
        }
      } else if (params.strategy === 'macd_trend') {
        const macd = calculateMACD(pastCloses);
        if (macd) {
          if (macd.histogram > 0 && macd.macd > macd.signal) {
            signal = 'BUY';
            reason = 'MACD bullish divergence crossover';
          } else if (macd.histogram < 0 && macd.macd < macd.signal) {
            signal = 'SELL';
            reason = 'MACD bearish momentum cross';
          }
        }
      } else if (params.strategy === 'bollinger_bounce') {
        const bb = calculateBollingerBands(pastCloses, 20, 2);
        if (bb) {
          if (currentCandle.close <= bb.lower) {
            signal = 'BUY';
            reason = 'Lower Bollinger Band support bounce';
          } else if (currentCandle.close >= bb.upper) {
            signal = 'SELL';
            reason = 'Upper Bollinger Band resistance test';
          }
        }
      }

      if (signal) {
        // Execute trade on next candle
        const entryPrice = nextCandle.open;
        const exitCandle = candles[Math.min(i + 2, candles.length - 1)];
        const exitPrice = exitCandle.close;

        let pnl = 0;
        let isWin = false;

        if (params.mode === 'binary') {
          const stake = Math.min(params.stakeOrRisk, currentBalance);
          const payout = params.payoutRate || 0.85;

          if (signal === 'BUY') {
            if (exitPrice > entryPrice) {
              pnl = stake * payout;
              isWin = true;
            } else {
              pnl = -stake;
              isWin = false;
            }
          } else {
            if (exitPrice < entryPrice) {
              pnl = stake * payout;
              isWin = true;
            } else {
              pnl = -stake;
              isWin = false;
            }
          }
        } else {
          // Forex mode
          const pipMult = params.symbol.includes('JPY') ? 0.01 : 0.0001;
          const slPips = params.slPips || 30;
          const tpPips = params.tpPips || 60;
          const riskAmount = (currentBalance * (params.stakeOrRisk || 2)) / 100;
          const rewardAmount = riskAmount * (tpPips / slPips);

          if (signal === 'BUY') {
            if (exitPrice >= entryPrice + tpPips * pipMult) {
              pnl = rewardAmount;
              isWin = true;
            } else if (exitPrice <= entryPrice - slPips * pipMult) {
              pnl = -riskAmount;
              isWin = false;
            } else {
              // Partial bar exit
              const diffPips = (exitPrice - entryPrice) / pipMult;
              pnl = (diffPips / slPips) * riskAmount;
              isWin = pnl > 0;
            }
          } else {
            if (exitPrice <= entryPrice - tpPips * pipMult) {
              pnl = rewardAmount;
              isWin = true;
            } else if (exitPrice >= entryPrice + slPips * pipMult) {
              pnl = -riskAmount;
              isWin = false;
            } else {
              const diffPips = (entryPrice - exitPrice) / pipMult;
              pnl = (diffPips / slPips) * riskAmount;
              isWin = pnl > 0;
            }
          }
        }

        currentBalance += pnl;
        if (isWin) grossProfit += pnl;
        else grossLoss += Math.abs(pnl);

        peakBalance = Math.max(peakBalance, currentBalance);
        const dd = ((peakBalance - currentBalance) / peakBalance) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

        trades.push({
          tradeNumber: trades.length + 1,
          entryTime: new Date(nextCandle.timestamp).toLocaleString(),
          exitTime: new Date(exitCandle.timestamp).toLocaleString(),
          type: params.mode === 'binary' ? (signal === 'BUY' ? 'CALL' : 'PUT') : signal,
          entryPrice,
          exitPrice,
          pnl: Number(pnl.toFixed(2)),
          pnlPercent: Number(((pnl / (currentBalance - pnl)) * 100).toFixed(2)),
          balanceAfter: Number(currentBalance.toFixed(2)),
          status: isWin ? 'WIN' : 'LOSS',
          reason,
        });

        equityCurve.push({
          time: new Date(exitCandle.timestamp).toISOString().split('T')[0],
          balance: Number(currentBalance.toFixed(2)),
        });

        // Skip ahead by 1 bar to prevent overlapping execution
        i++;
      }
    }

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.status === 'WIN').length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
    const netProfit = Number((currentBalance - params.initialBalance).toFixed(2));
    const netProfitPercent = Number(((netProfit / params.initialBalance) * 100).toFixed(2));
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 1.0;
    const expectancy = totalTrades > 0 ? Number((netProfit / totalTrades).toFixed(2)) : 0;

    // Approximate Sharpe Ratio based on trade returns
    const returns = trades.map((t) => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length - 1) : 1;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? Number(((avgReturn / stdDev) * Math.sqrt(252)).toFixed(2)) : 1.2;

    return {
      params,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      netProfit,
      netProfitPercent,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      profitFactor,
      maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
      expectancy,
      sharpeRatio,
      trades,
      equityCurve,
    };
  }
}

export const backtestEngine = new BacktestEngine();
