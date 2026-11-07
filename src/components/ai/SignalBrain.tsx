import React, { useState } from 'react';
import { AISignalResult, TradingMode } from '../../types/ai.js';
import { api } from '../../services/apiClient.js';
import { notifications } from '../../utils/notifications.js';
import {
  Sparkles,
  Cpu,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface Props {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  mode: TradingMode;
  onModeChange: (mode: TradingMode) => void;
  onExecutePaperTrade?: (signal: AISignalResult) => void;
}

export const SignalBrain: React.FC<Props> = ({
  selectedSymbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  mode,
  onModeChange,
  onExecutePaperTrade,
}) => {
  const [loading, setLoading] = useState(false);
  const [enableThinking, setEnableThinking] = useState(true);
  const [signal, setSignal] = useState<AISignalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState('Multi-Confluence Quant Engine');

  const handleGetSignal = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getSignal({
        symbol: selectedSymbol,
        timeframe,
        mode,
        enableThinking,
        strategy,
      });
      setSignal(result);
      if (result.direction !== 'WAIT') {
        notifications.notifySignal(selectedSymbol, result.direction, result.confidence, result.entryPrice);
      } else {
        notifications.notifyMarketAlert('AI Signal: WAIT / NO TRADE', `Confidence: ${result.confidence.toFixed(1)}% | Market is currently ranging or lacks clear confluence.`, selectedSymbol);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch AI signal. Please verify provider connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BUY':
        return 'text-[#00FF88] border-[#00FF88]/40 bg-[#00FF88]/10';
      case 'SELL':
        return 'text-[#FF4560] border-[#FF4560]/40 bg-[#FF4560]/10';
      default:
        return 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10';
    }
  };

  const getDirectionText = (direction: string, m: TradingMode) => {
    if (direction === 'BUY') return m === 'binary' ? 'CALL / UP' : 'BUY / LONG';
    if (direction === 'SELL') return m === 'binary' ? 'PUT / DOWN' : 'SELL / SHORT';
    return 'WAIT / NO TRADE';
  };

  return (
    <div className="flex flex-col bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B] bg-[#070B10]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#00F3FF]/10 border border-[#00F3FF]/20 text-[#00F3FF]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EDF5] tracking-tight flex items-center gap-2">
              AI Quantitative Signal Brain
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#00F3FF]/20 text-[#00F3FF] border border-[#00F3FF]/30">
                PRO V2.1
              </span>
            </h2>
            <p className="text-xs text-[#8B98AA]">Multi-model quantitative reasoning & confluence analysis</p>
          </div>
        </div>

        {/* High Thinking Mode Toggle */}
        <div className="flex items-center gap-2 bg-[#101722] px-3 py-1.5 rounded-lg border border-[#1E293B]">
          <Cpu className="w-4 h-4 text-[#00F3FF]" />
          <span className="text-xs font-medium text-[#E8EDF5]">High Thinking</span>
          <button
            type="button"
            role="switch"
            aria-checked={enableThinking}
            aria-label="Toggle High Thinking Mode"
            onClick={() => setEnableThinking(!enableThinking)}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
              enableThinking ? 'bg-[#00F3FF]' : 'bg-[#1E293B]'
            }`}
          >
            <div
              className={`bg-[#04060A] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                enableThinking ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Input Parameters Controls */}
      <div className="p-5 border-b border-[#1E293B] bg-[#0B1018] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Symbol Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B98AA] mb-1.5">
              Market / Asset
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] font-semibold focus:outline-none focus:border-[#00F3FF] transition-colors"
            >
              <optgroup label="Forex Major & Minor">
                <option value="EUR/USD">EUR/USD (Euro / US Dollar)</option>
                <option value="GBP/USD">GBP/USD (British Pound / USD)</option>
                <option value="USD/JPY">USD/JPY (US Dollar / Yen)</option>
                <option value="USD/CHF">USD/CHF (US Dollar / Swiss Franc)</option>
                <option value="AUD/USD">AUD/USD (Aussie / US Dollar)</option>
                <option value="USD/CAD">USD/CAD (US Dollar / CAD)</option>
                <option value="NZD/USD">NZD/USD (Kiwi / US Dollar)</option>
              </optgroup>
              <optgroup label="Precious Metals & Crypto">
                <option value="XAU/USD">XAU/USD (Gold Spot)</option>
                <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                <option value="ETH/USD">ETH/USD (Ethereum)</option>
              </optgroup>
            </select>
          </div>

          {/* Timeframe Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B98AA] mb-1.5">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] font-semibold focus:outline-none focus:border-[#00F3FF] transition-colors"
            >
              <option value="1m">1M (Scalping / Rapid Expiry)</option>
              <option value="5m">5M (Intraday Momentum)</option>
              <option value="15m">15M (Structural Swings)</option>
              <option value="1h">1H (Session Trend)</option>
              <option value="4h">4H (Macro Trend)</option>
              <option value="1d">1D (Daily Swing)</option>
            </select>
          </div>

          {/* Trading Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B98AA] mb-1.5">
              Trading Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#101722] border border-[#1E293B] rounded-lg">
              <button
                type="button"
                onClick={() => onModeChange('binary')}
                className={`py-1.5 text-xs font-bold rounded transition-all ${
                  mode === 'binary'
                    ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20'
                    : 'text-[#8B98AA] hover:text-[#E8EDF5]'
                }`}
              >
                Binary Options
              </button>
              <button
                type="button"
                onClick={() => onModeChange('forex')}
                className={`py-1.5 text-xs font-bold rounded transition-all ${
                  mode === 'forex'
                    ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20'
                    : 'text-[#8B98AA] hover:text-[#E8EDF5]'
                }`}
              >
                Forex AI Suite
              </button>
            </div>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-[#8B98AA]">
            <span>Strategy:</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="bg-[#101722] border border-[#1E293B] rounded px-2.5 py-1 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            >
              <option value="Multi-Confluence Quant Engine">Multi-Confluence Quant Engine</option>
              <option value="RSI Overbought/Oversold Reversal">RSI Reversal & Divergence</option>
              <option value="EMA Trend Momentum Confluence">EMA Trend Following</option>
              <option value="Bollinger Band Volatility Breakout">Bollinger Mean Reversion</option>
            </select>
          </div>

          <div className="text-xs text-[#8B98AA] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
            <span>AI Model: {enableThinking ? 'gemini-4-argon (Thinking Level: High)' : 'gemini-3.8-flash'}</span>
          </div>
        </div>

        {/* The Action Button: GET SIGNAL */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGetSignal}
            disabled={loading}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] ${
              loading
                ? 'bg-[#1E293B] text-[#8B98AA] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#00F3FF] to-[#00FF88] text-[#04060A] hover:shadow-lg hover:shadow-[#00F3FF]/25 hover:brightness-110 font-extrabold uppercase'
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-[#8B98AA] border-t-[#00F3FF] rounded-full animate-spin" />
                <span>Analyzing Live Candles & Indicators with AI...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>GET SIGNAL ({selectedSymbol} • {timeframe.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 mx-5 mt-4 rounded-lg bg-[#FF4560]/10 border border-[#FF4560]/30 flex items-start gap-3 text-sm text-[#FF4560]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Signal Generation Error</h4>
            <p className="text-xs opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Generated Signal Output Result Card */}
      {signal && (
        <div className="p-5 space-y-5 bg-[#0B1018]">
          {/* Signal Header Banner */}
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${getDirectionColor(signal.direction)}`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#04060A]/40">
                {signal.direction === 'BUY' ? (
                  <TrendingUp className="w-7 h-7 text-[#00FF88]" />
                ) : signal.direction === 'SELL' ? (
                  <TrendingDown className="w-7 h-7 text-[#FF4560]" />
                ) : (
                  <Clock className="w-7 h-7 text-[#F59E0B]" />
                )}
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest opacity-80">
                  AI Decision ({signal.mode.toUpperCase()})
                </span>
                <h3 className="text-2xl font-black tracking-tight">
                  {getDirectionText(signal.direction, signal.mode)}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] uppercase font-bold tracking-wider opacity-80 block">Signal Status</span>
                <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-[#04060A]/60 border border-current">
                  {signal.status}
                </span>
              </div>

              <div className="text-right pl-4 border-l border-current/20">
                <span className="text-[11px] uppercase font-bold tracking-wider opacity-80 block">Confidence</span>
                <span className="text-xl font-black font-mono-numbers">{signal.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Pricing & Parameter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
              <span className="text-[11px] text-[#8B98AA] font-semibold uppercase block">Entry Price</span>
              <span className="text-base font-bold text-[#E8EDF5] font-mono-numbers">
                {signal.entryPrice.toFixed(signal.symbol.includes('JPY') ? 3 : signal.symbol.includes('BTC') ? 2 : 5)}
              </span>
            </div>

            {signal.mode === 'forex' ? (
              <>
                <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
                  <span className="text-[11px] text-[#FF4560] font-semibold uppercase block">Stop Loss (SL)</span>
                  <span className="text-base font-bold text-[#FF4560] font-mono-numbers">
                    {signal.stopLoss ? signal.stopLoss.toFixed(5) : 'Dynamic S/R'}
                  </span>
                </div>
                <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
                  <span className="text-[11px] text-[#00FF88] font-semibold uppercase block">Take Profit (TP)</span>
                  <span className="text-base font-bold text-[#00FF88] font-mono-numbers">
                    {signal.takeProfit ? signal.takeProfit.toFixed(5) : 'Dynamic S/R'}
                  </span>
                </div>
                <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
                  <span className="text-[11px] text-[#00F3FF] font-semibold uppercase block">Risk : Reward</span>
                  <span className="text-base font-bold text-[#00F3FF] font-mono-numbers">
                    1 : {signal.riskRewardRatio ?? 1.8}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
                  <span className="text-[11px] text-[#00F3FF] font-semibold uppercase block">Expiry Time</span>
                  <span className="text-base font-bold text-[#00F3FF] font-mono-numbers">
                    {signal.expiryMinutes ?? 5} Minutes
                  </span>
                </div>
                <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
                  <span className="text-[11px] text-[#8B98AA] font-semibold uppercase block">RSI-14</span>
                  <span className="text-base font-bold text-[#E8EDF5] font-mono-numbers">
                    {signal.indicators.rsi14 ?? 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
                  <span className="text-[11px] text-[#8B98AA] font-semibold uppercase block">Market Trend</span>
                  <span className="text-base font-bold text-[#E8EDF5]">
                    {signal.indicators.trend}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Reasoning & Quantitative Analysis */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00F3FF]" />
              Quantitative Confluence & Reasoning
            </h4>
            <div className="bg-[#101722] p-4 rounded-xl border border-[#1E293B] space-y-2">
              {signal.reasoning.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#E8EDF5]">
                  <CheckCircle2 className="w-4 h-4 text-[#00FF88] flex-shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Invalidation Conditions & Risk Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
              <span className="text-[11px] font-bold text-[#F59E0B] uppercase flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Invalidation Conditions
              </span>
              <ul className="list-disc list-inside text-[#8B98AA] space-y-1">
                {signal.invalidation_conditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B]">
              <span className="text-[11px] font-bold text-[#8B98AA] uppercase flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#00F3FF]" />
                Risk Advisory
              </span>
              <ul className="list-disc list-inside text-[#8B98AA] space-y-1">
                {signal.risk_notes.map((rn, i) => (
                  <li key={i}>{rn}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* One-Click Execute Paper Trade Button */}
          {signal.direction !== 'WAIT' && onExecutePaperTrade && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onExecutePaperTrade(signal)}
                className="w-full py-3 px-4 bg-[#101722] hover:bg-[#1E293B] border border-[#00F3FF]/40 hover:border-[#00F3FF] text-[#00F3FF] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <span>Populate & Execute Paper {signal.direction === 'BUY' ? 'CALL/LONG' : 'PUT/SHORT'} Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-[#8B98AA] pt-2 border-t border-[#1E293B]">
            <span>Model: {signal.model_id}</span>
            <span>Feed Source: {signal.provider_source}</span>
            <span>Generated: {new Date(signal.generated_at).toLocaleTimeString()} UTC</span>
          </div>
        </div>
      )}
    </div>
  );
};
