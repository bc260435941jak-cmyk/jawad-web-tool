import React, { useState } from 'react';
import { api } from '../../services/apiClient.js';
import { BacktestResult } from '../../../server/backtest/backtestEngine.js';
import { Play, Download, TrendingUp, AlertTriangle, BarChart3, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export const BacktestWorkspace: React.FC = () => {
  const [symbol, setSymbol] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('15m');
  const [strategy, setStrategy] = useState<'rsi_reversal' | 'ema_crossover' | 'macd_trend' | 'bollinger_bounce'>('rsi_reversal');
  const [mode, setMode] = useState<'binary' | 'forex'>('binary');
  const [stakeOrRisk, setStakeOrRisk] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest({
        symbol,
        timeframe,
        strategy,
        mode,
        stakeOrRisk,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Backtest failed to execute');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result || result.trades.length === 0) return;
    const headers = ['Trade#', 'Entry Time', 'Exit Time', 'Type', 'Entry Price', 'Exit Price', 'P/L ($)', 'P/L (%)', 'Balance After', 'Status', 'Reason'];
    const rows = result.trades.map((t) => [
      t.tradeNumber,
      `"${t.entryTime}"`,
      `"${t.exitTime}"`,
      t.type,
      t.entryPrice,
      t.exitPrice,
      t.pnl,
      `${t.pnlPercent}%`,
      t.balanceAfter,
      t.status,
      `"${t.reason}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ObsidianQuant_Backtest_${symbol.replace('/', '_')}_${strategy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#1E293B] gap-4">
          <div>
            <h2 className="text-base font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#00F3FF]" />
              Historical Quantitative Backtest Engine
            </h2>
            <p className="text-xs text-[#8B98AA]">
              Zero look-ahead bias, walk-forward candle validation, and institutional risk metrics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8B98AA] bg-[#101722] px-2.5 py-1 rounded border border-[#1E293B]">
              Standard Capital: $10,000.00
            </span>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B98AA] mb-1">Asset</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            >
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
              <option value="USD/JPY">USD/JPY</option>
              <option value="AUD/USD">AUD/USD</option>
              <option value="XAU/USD">XAU/USD</option>
              <option value="BTC/USD">BTC/USD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B98AA] mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            >
              <option value="1m">1M (High Frequency)</option>
              <option value="5m">5M (Intraday)</option>
              <option value="15m">15M (Swing)</option>
              <option value="1h">1H (Session)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B98AA] mb-1">Engine Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            >
              <option value="binary">Binary Options (Fixed Expiry)</option>
              <option value="forex">Forex (Risk-Reward 1:2)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B98AA] mb-1">Strategy Rule</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            >
              <option value="rsi_reversal">RSI Reversal (30 / 70)</option>
              <option value="ema_crossover">EMA 9 / 21 Crossover</option>
              <option value="macd_trend">MACD Divergence</option>
              <option value="bollinger_bounce">Bollinger Band Bounce</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleRunBacktest}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                loading
                  ? 'bg-[#1E293B] text-[#8B98AA]'
                  : 'bg-[#00F3FF] hover:bg-[#00FF88] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-extrabold'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Simulating...' : 'Run Test'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FF4560]/10 border border-[#FF4560]/30 text-xs text-[#FF4560] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Metrics Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 bg-[#0B1018] border border-[#1E293B] rounded-xl text-center space-y-1 shadow">
              <span className="text-[10px] text-[#8B98AA] font-semibold uppercase block">Total Trades</span>
              <span className="font-mono-numbers text-xl font-black text-[#E8EDF5]">{result.totalTrades}</span>
            </div>

            <div className="p-4 bg-[#0B1018] border border-[#1E293B] rounded-xl text-center space-y-1 shadow">
              <span className="text-[10px] text-[#8B98AA] font-semibold uppercase block">Win Rate</span>
              <span className="font-mono-numbers text-xl font-black text-[#00FF88]">{result.winRate}%</span>
            </div>

            <div className="p-4 bg-[#0B1018] border border-[#1E293B] rounded-xl text-center space-y-1 shadow">
              <span className="text-[10px] text-[#8B98AA] font-semibold uppercase block">Net Profit</span>
              <span className={`font-mono-numbers text-xl font-black ${result.netProfit >= 0 ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                {result.netProfit >= 0 ? '+' : ''}${result.netProfit.toFixed(2)}
              </span>
            </div>

            <div className="p-4 bg-[#0B1018] border border-[#1E293B] rounded-xl text-center space-y-1 shadow">
              <span className="text-[10px] text-[#8B98AA] font-semibold uppercase block">Profit Factor</span>
              <span className="font-mono-numbers text-xl font-black text-[#00F3FF]">{result.profitFactor}</span>
            </div>

            <div className="p-4 bg-[#0B1018] border border-[#1E293B] rounded-xl text-center space-y-1 shadow">
              <span className="text-[10px] text-[#8B98AA] font-semibold uppercase block">Max Drawdown</span>
              <span className="font-mono-numbers text-xl font-black text-[#FF4560]">{result.maxDrawdownPercent}%</span>
            </div>

            <div className="p-4 bg-[#0B1018] border border-[#1E293B] rounded-xl text-center space-y-1 shadow">
              <span className="text-[10px] text-[#8B98AA] font-semibold uppercase block">Sharpe Ratio</span>
              <span className="font-mono-numbers text-xl font-black text-[#E8EDF5]">{result.sharpeRatio}</span>
            </div>
          </div>

          {/* Equity Progression Bar Visualizer */}
          <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00FF88]" />
                Simulated Equity Curve Progression
              </h4>
              <span className="text-xs font-mono-numbers text-[#00FF88] font-bold">
                Final Capital: ${result.equityCurve[result.equityCurve.length - 1]?.balance.toFixed(2)}
              </span>
            </div>

            <div className="h-28 flex items-end gap-1.5 p-3 bg-[#101722] rounded-lg border border-[#1E293B] overflow-x-auto">
              {result.equityCurve.map((pt, idx) => {
                const minBal = Math.min(...result.equityCurve.map((c) => c.balance)) * 0.98;
                const maxBal = Math.max(...result.equityCurve.map((c) => c.balance)) * 1.02;
                const range = maxBal - minBal || 1;
                const heightPct = Math.max(10, Math.min(100, ((pt.balance - minBal) / range) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center min-w-[12px] group relative">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        pt.balance >= 10000 ? 'bg-[#00FF88] group-hover:bg-[#00F3FF]' : 'bg-[#FF4560]'
                      }`}
                    />
                    <div className="hidden group-hover:block absolute bottom-full mb-2 bg-[#04060A] border border-[#1E293B] px-2 py-1 rounded text-[10px] font-mono-numbers text-white z-10 whitespace-nowrap shadow-xl">
                      ${pt.balance.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade Log Table with CSV Export */}
          <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E293B] bg-[#070B10]">
              <h4 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00F3FF]" />
                Trade-By-Trade Audit Log ({result.trades.length} Executions)
              </h4>

              <button
                type="button"
                onClick={exportCSV}
                className="px-3 py-1 bg-[#101722] hover:bg-[#1E293B] border border-[#00F3FF]/30 text-[#00F3FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs text-[#E8EDF5]">
                <thead className="bg-[#101722] text-[#8B98AA] uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Entry Time</th>
                    <th className="px-4 py-3">Exit Time</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Entry Price</th>
                    <th className="px-4 py-3">Exit Price</th>
                    <th className="px-4 py-3">Profit / Loss</th>
                    <th className="px-4 py-3">Balance After</th>
                    <th className="px-4 py-3">Signal Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {result.trades.map((t) => (
                    <tr key={t.tradeNumber} className="hover:bg-[#101722]/50">
                      <td className="px-4 py-3 font-mono-numbers">{t.tradeNumber}</td>
                      <td className="px-4 py-3 text-[#8B98AA]">{t.entryTime}</td>
                      <td className="px-4 py-3 text-[#8B98AA]">{t.exitTime}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            t.type === 'CALL' || t.type === 'BUY'
                              ? 'bg-[#00FF88]/20 text-[#00FF88]'
                              : 'bg-[#FF4560]/20 text-[#FF4560]'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono-numbers">{t.entryPrice.toFixed(5)}</td>
                      <td className="px-4 py-3 font-mono-numbers">{t.exitPrice.toFixed(5)}</td>
                      <td className={`px-4 py-3 font-mono-numbers font-bold ${t.pnl >= 0 ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono-numbers">${t.balanceAfter.toFixed(2)}</td>
                      <td className="px-4 py-3 text-[#8B98AA] truncate max-w-[200px]">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
