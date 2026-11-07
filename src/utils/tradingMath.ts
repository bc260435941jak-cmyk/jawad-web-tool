/**
 * Calculates Binary Option payout and outcome
 */
export function calculateBinaryPayout(stake: number, payoutRate: number): {
  winProfit: number;
  totalReturn: number;
  maxLoss: number;
} {
  const winProfit = Number((stake * payoutRate).toFixed(2));
  const totalReturn = Number((stake + winProfit).toFixed(2));
  return {
    winProfit,
    totalReturn,
    maxLoss: stake,
  };
}

/**
 * Evaluates binary trade settlement
 */
export function evaluateBinaryOutcome(
  type: 'CALL' | 'PUT',
  entryPrice: number,
  exitPrice: number,
  stake: number,
  payoutRate: number
): {
  status: 'WON' | 'LOST' | 'TIED';
  realizedPnl: number;
} {
  if (type === 'CALL') {
    if (exitPrice > entryPrice) {
      return { status: 'WON', realizedPnl: Number((stake * payoutRate).toFixed(2)) };
    } else if (exitPrice < entryPrice) {
      return { status: 'LOST', realizedPnl: -stake };
    } else {
      return { status: 'TIED', realizedPnl: 0 };
    }
  } else {
    // PUT
    if (exitPrice < entryPrice) {
      return { status: 'WON', realizedPnl: Number((stake * payoutRate).toFixed(2)) };
    } else if (exitPrice > entryPrice) {
      return { status: 'LOST', realizedPnl: -stake };
    } else {
      return { status: 'TIED', realizedPnl: 0 };
    }
  }
}

/**
 * Gets pip multiplier based on symbol (e.g. JPY pairs use 0.01, standard use 0.0001, Gold 0.1, Crypto 1.0)
 */
export function getPipMultiplier(symbol: string): number {
  const clean = symbol.toUpperCase().replace('/', '');
  if (clean.includes('JPY')) return 0.01;
  if (clean.includes('XAU')) return 0.1;
  if (clean.includes('BTC') || clean.includes('ETH')) return 1.0;
  return 0.0001;
}

/**
 * Calculates pip distance between two prices
 */
export function calculatePips(symbol: string, price1: number, price2: number): number {
  const mult = getPipMultiplier(symbol);
  return Number((Math.abs(price1 - price2) / mult).toFixed(1));
}

/**
 * Calculates Risk to Reward ratio
 */
export function calculateRiskRewardRatio(
  type: 'BUY' | 'SELL',
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number | null {
  if (type === 'BUY') {
    const risk = entryPrice - stopLoss;
    const reward = takeProfit - entryPrice;
    if (risk <= 0 || reward <= 0) return null;
    return Number((reward / risk).toFixed(2));
  } else {
    const risk = stopLoss - entryPrice;
    const reward = entryPrice - takeProfit;
    if (risk <= 0 || reward <= 0) return null;
    return Number((reward / risk).toFixed(2));
  }
}

/**
 * Calculates recommended lot size based on account balance, risk percentage, and stop loss distance
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number, // e.g. 1% or 2%
  entryPrice: number,
  stopLoss: number,
  symbol: string
): {
  lots: number;
  riskAmount: number;
  pipsAtRisk: number;
} {
  const riskAmount = (accountBalance * riskPercent) / 100;
  const pipsAtRisk = calculatePips(symbol, entryPrice, stopLoss);
  if (pipsAtRisk <= 0) {
    return { lots: 0.01, riskAmount, pipsAtRisk: 0 };
  }

  // Standard lot = 100,000 units => $10 per pip for EUR/USD
  // Mini lot (0.1) = $1 per pip
  // Micro lot (0.01) = $0.10 per pip
  const costPerPipForStandardLot = 10;
  const rawLots = riskAmount / (pipsAtRisk * costPerPipForStandardLot);
  const clampedLots = Math.max(0.01, Math.min(50, Number(rawLots.toFixed(2))));

  return {
    lots: clampedLots,
    riskAmount: Number(riskAmount.toFixed(2)),
    pipsAtRisk,
  };
}
