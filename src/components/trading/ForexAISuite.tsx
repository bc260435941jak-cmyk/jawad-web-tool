import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { calculatePositionSize, calculateRiskRewardRatio, getPipMultiplier } from '../../utils/tradingMath.js';
import { ArrowUpRight, ArrowDownRight, Calculator, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  symbol: string;
  currentPrice?: number;
  accountBalance: number;
  onOrderPlaced: () => void;
  prefillSL?: number;
  prefillTP?: number;
}

export const ForexAISuite: React.FC<Props> = ({
  symbol,
  currentPrice = 1.0850,
  accountBalance,
  onOrderPlaced,
  prefillSL,
  prefillTP,
}) => {
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [lots, setLots] = useState<number>(0.1);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const pipMult = getPipMultiplier(symbol);

  // Initialize or update SL/TP based on props or current price
  useEffect(() => {
    if (prefillSL) setStopLoss(prefillSL.toFixed(symbol.includes('JPY') ? 3 : 5));
    else if (currentPrice) {
      setStopLoss((currentPrice - 30 * pipMult).toFixed(symbol.includes('JPY') ? 3 : 5));
    }

    if (prefillTP) setTakeProfit(prefillTP.toFixed(symbol.includes('JPY') ? 3 : 5));
    else if (currentPrice) {
      setTakeProfit((currentPrice + 60 * pipMult).toFixed(symbol.includes('JPY') ? 3 : 5));
    }
  }, [symbol, currentPrice, prefillSL, prefillTP]);

  // Recalculate recommended position size
  useEffect(() => {
    const slNum = parseFloat(stopLoss);
    if (!isNaN(slNum) && currentPrice) {
      const sizing = calculatePositionSize(accountBalance, riskPercent, currentPrice, slNum, symbol);
      if (sizing.lots > 0) {
        setLots(sizing.lots);
      }
    }
  }, [accountBalance, riskPercent, stopLoss, currentPrice, symbol]);

  const slNum = parseFloat(stopLoss);
  const tpNum = parseFloat(takeProfit);
  const buyRR = !isNaN(slNum) && !isNaN(tpNum) ? calculateRiskRewardRatio('BUY', currentPrice, slNum, tpNum) : null;

  const handlePlaceOrder = async (type: 'BUY' | 'SELL') => {
    setLoading(true);
    setFeedback(null);
    try {
      await api.placePaperOrder({
        orderType: 'forex',
        symbol,
        type,
        lots,
        stopLoss: slNum || undefined,
        takeProfit: tpNum || undefined,
      });

      setFeedback({
        message: `Paper Forex ${type} position opened: ${lots} Lots @ ${currentPrice}`,
        type: 'success',
      });
      onOrderPlaced();
    } catch (err: any) {
      setFeedback({
        message: err?.message || 'Failed to open paper Forex order',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div>
          <h3 className="text-sm font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F3FF]" />
            Forex AI Position Suite
          </h3>
          <p className="text-xs text-[#8B98AA]">Precision position sizing, dynamic R:R, and stop management</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101722] rounded-lg border border-[#1E293B] text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00F3FF]" />
          <span className="text-[#8B98AA]">Paper Forex:</span>
          <span className="font-bold text-[#00F3FF]">Active</span>
        </div>
      </div>

      {/* Quote Display */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-[#101722] rounded-xl border border-[#1E293B] text-center">
        <div>
          <span className="text-[10px] text-[#8B98AA] uppercase font-bold block">Bid</span>
          <span className="font-mono-numbers text-xs font-bold text-[#00FF88]">
            {(currentPrice - (1.2 * pipMult) / 2).toFixed(symbol.includes('JPY') ? 3 : 5)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#8B98AA] uppercase font-bold block">Spread</span>
          <span className="font-mono-numbers text-xs font-bold text-[#00F3FF]">1.2 Pips</span>
        </div>
        <div>
          <span className="text-[10px] text-[#8B98AA] uppercase font-bold block">Ask</span>
          <span className="font-mono-numbers text-xs font-bold text-[#FF4560]">
            {(currentPrice + (1.2 * pipMult) / 2).toFixed(symbol.includes('JPY') ? 3 : 5)}
          </span>
        </div>
      </div>

      {/* Risk Percentage and Lot Sizing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold uppercase tracking-wider text-[#8B98AA] flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-[#00F3FF]" />
            Risk % per Trade
          </label>
          <span className="text-[#00F3FF] font-bold">{riskPercent}% of Balance (${((accountBalance * riskPercent) / 100).toFixed(2)})</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[0.5, 1.0, 2.0, 3.0].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRiskPercent(r)}
              className={`py-1 text-xs font-bold rounded-lg border transition-all ${
                riskPercent === r
                  ? 'bg-[#00F3FF] border-[#00F3FF] text-[#04060A] font-extrabold shadow-md shadow-[#00F3FF]/20'
                  : 'bg-[#101722] border-[#1E293B] text-[#8B98AA] hover:text-[#E8EDF5]'
              }`}
            >
              {r}%
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-semibold uppercase text-[#8B98AA]">Calculated Position Size (Lots)</label>
            <span className="text-[#00FF88] font-mono-numbers font-bold">{lots} Standard Lots</span>
          </div>
          <input
            type="number"
            step={0.01}
            min={0.01}
            max={50}
            value={lots}
            onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
            className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
          />
        </div>
      </div>

      {/* Stop Loss & Take Profit Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-[#FF4560] mb-1">
            Stop Loss (Price)
          </label>
          <input
            type="number"
            step={symbol.includes('JPY') ? '0.001' : '0.00001'}
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-[#101722] border border-[#FF4560]/30 rounded-lg px-3 py-2 text-xs font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#FF4560]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-[#00FF88] mb-1">
            Take Profit (Price)
          </label>
          <input
            type="number"
            step={symbol.includes('JPY') ? '0.001' : '0.00001'}
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full bg-[#101722] border border-[#00FF88]/30 rounded-lg px-3 py-2 text-xs font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00FF88]"
          />
        </div>
      </div>

      {/* Risk-to-Reward Ratio Box */}
      <div className="p-3 bg-[#101722] rounded-xl border border-[#1E293B] flex items-center justify-between text-xs">
        <span className="text-[#8B98AA]">Risk to Reward (R:R):</span>
        <span className="font-mono-numbers font-bold text-[#00F3FF]">
          {buyRR ? `1 : ${buyRR.toFixed(2)}` : '1 : 2.00 (Standard)'}
        </span>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88]'
              : 'bg-[#FF4560]/10 border border-[#FF4560]/30 text-[#FF4560]'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Order Action Buttons: BUY / LONG and SELL / SHORT */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => handlePlaceOrder('BUY')}
          disabled={loading}
          className="py-3.5 px-4 bg-gradient-to-r from-[#00FF88] to-[#00F3FF] hover:brightness-110 active:scale-[0.98] text-[#04060A] font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#00FF88]/20 transition-all"
        >
          <ArrowUpRight className="w-5 h-5 stroke-[3]" />
          <span>BUY / LONG</span>
        </button>

        <button
          type="button"
          onClick={() => handlePlaceOrder('SELL')}
          disabled={loading}
          className="py-3.5 px-4 bg-gradient-to-r from-[#FF4560] to-[#E11D48] hover:brightness-110 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#FF4560]/20 transition-all"
        >
          <ArrowDownRight className="w-5 h-5 stroke-[3]" />
          <span>SELL / SHORT</span>
        </button>
      </div>
    </div>
  );
};
