import React, { useState } from 'react';
import { api } from '../../services/apiClient.js';
import { calculateBinaryPayout } from '../../utils/tradingMath.js';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, DollarSign, Clock, AlertCircle } from 'lucide-react';

interface Props {
  symbol: string;
  currentPrice?: number;
  onOrderPlaced: () => void;
  payoutRate?: number;
}

export const BinaryQuantEngine: React.FC<Props> = ({
  symbol,
  currentPrice,
  onOrderPlaced,
  payoutRate = 0.85,
}) => {
  const [stake, setStake] = useState<number>(25);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const presets = [10, 25, 50, 100, 250];
  const durations = [1, 5, 15, 30];

  const { winProfit, totalReturn } = calculateBinaryPayout(stake, payoutRate);

  const handlePlaceOrder = async (type: 'CALL' | 'PUT') => {
    setLoading(true);
    setFeedback(null);
    try {
      await api.placePaperOrder({
        orderType: 'binary',
        symbol,
        type,
        stake,
        durationMinutes,
      });

      setFeedback({
        message: `Paper ${type} contract opened successfully for $${stake} (${durationMinutes}m expiry)`,
        type: 'success',
      });
      onOrderPlaced();
    } catch (err: any) {
      setFeedback({
        message: err?.message || 'Failed to open paper binary contract',
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF88]" />
            Binary Quant Order Engine
          </h3>
          <p className="text-xs text-[#8B98AA]">Fixed-time contract simulation with provider contract math</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101722] rounded-lg border border-[#1E293B] text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00FF88]" />
          <span className="text-[#8B98AA]">Paper Mode:</span>
          <span className="font-bold text-[#00FF88]">Active</span>
        </div>
      </div>

      {/* Symbol & Price Overview */}
      <div className="p-3.5 bg-[#101722] rounded-xl border border-[#1E293B] flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase text-[#8B98AA] block">Target Contract</span>
          <span className="text-base font-bold text-[#E8EDF5]">{symbol}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-semibold uppercase text-[#8B98AA] block">Strike / Entry Quote</span>
          <span className="font-mono-numbers text-base font-bold text-[#00FF88]">
            {currentPrice ? currentPrice.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') ? 2 : 5) : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Stake Selector & Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold uppercase tracking-wider text-[#8B98AA]">Investment Stake</label>
          <span className="text-[#00F3FF] font-mono-numbers font-bold">${stake}.00</span>
        </div>

        <div className="relative">
          <DollarSign className="w-4 h-4 text-[#8B98AA] absolute left-3 top-2.5" />
          <input
            type="number"
            min={5}
            max={500}
            value={stake}
            onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
            className="w-full bg-[#101722] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2 text-sm font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
          />
        </div>

        {/* Stake Preset Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setStake(p)}
              className={`py-1 text-xs font-semibold rounded border transition-all ${
                stake === p
                  ? 'bg-[#00F3FF]/20 border-[#00F3FF] text-[#00F3FF] font-bold'
                  : 'bg-[#101722] border-[#1E293B] text-[#8B98AA] hover:text-[#E8EDF5]'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
      </div>

      {/* Expiry Duration Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold uppercase tracking-wider text-[#8B98AA] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#00F3FF]" />
            Contract Expiry Duration
          </label>
          <span className="text-[#00F3FF] font-bold">{durationMinutes} Minutes</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {durations.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDurationMinutes(d)}
              className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                durationMinutes === d
                  ? 'bg-[#00F3FF] border-[#00F3FF] text-[#04060A] font-extrabold shadow-md shadow-[#00F3FF]/20'
                  : 'bg-[#101722] border-[#1E293B] text-[#8B98AA] hover:text-[#E8EDF5]'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Payout & Return Calculation Box */}
      <div className="p-3 bg-[#101722] rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8B98AA]">Verified Payout Rate:</span>
          <span className="font-bold text-[#00FF88] font-mono-numbers">{Math.round(payoutRate * 100)}%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8B98AA]">Expected Net Profit:</span>
          <span className="font-bold text-[#00FF88] font-mono-numbers">+${winProfit.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1E293B]/60 font-semibold">
          <span className="text-[#E8EDF5]">Total Return on Win:</span>
          <span className="font-bold text-[#00F3FF] font-mono-numbers">${totalReturn.toFixed(2)}</span>
        </div>
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

      {/* Dual Big Action Buttons: CALL / UP and PUT / DOWN */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => handlePlaceOrder('CALL')}
          disabled={loading}
          className="py-3.5 px-4 bg-gradient-to-r from-[#00FF88] to-[#00F3FF] hover:brightness-110 active:scale-[0.98] text-[#04060A] font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#00FF88]/20 transition-all"
        >
          <ArrowUpRight className="w-5 h-5 stroke-[3]" />
          <span>CALL / UP</span>
        </button>

        <button
          type="button"
          onClick={() => handlePlaceOrder('PUT')}
          disabled={loading}
          className="py-3.5 px-4 bg-gradient-to-r from-[#FF4560] to-[#E11D48] hover:brightness-110 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#FF4560]/20 transition-all"
        >
          <ArrowDownRight className="w-5 h-5 stroke-[3]" />
          <span>PUT / DOWN</span>
        </button>
      </div>
    </div>
  );
};
