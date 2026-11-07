import React, { useState } from 'react';
import { BinaryOrder, ForexPosition, ForexClosedTrade } from '../../types/trading.js';
import { api } from '../../services/apiClient.js';
import { Clock, TrendingUp, TrendingDown, XCircle, CheckCircle2, History, Layers } from 'lucide-react';

interface Props {
  binaryOrders: BinaryOrder[];
  forexPositions: ForexPosition[];
  forexClosedTrades: ForexClosedTrade[];
  onPositionUpdated: () => void;
}

export const PositionsAndHistory: React.FC<Props> = ({
  binaryOrders,
  forexPositions,
  forexClosedTrades,
  onPositionUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'binary' | 'forex' | 'history'>('binary');
  const [closingId, setClosingId] = useState<string | null>(null);

  const handleCloseForex = async (posId: string) => {
    setClosingId(posId);
    try {
      await api.closeForexPosition(posId);
      onPositionUpdated();
    } catch (err) {
      console.error('Failed to close position:', err);
    } finally {
      setClosingId(null);
    }
  };

  const openBinary = binaryOrders.filter((o) => o.status === 'OPEN');
  const settledBinary = binaryOrders.filter((o) => o.status !== 'OPEN');

  return (
    <div className="flex flex-col bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-[#1E293B] bg-[#070B10] gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('binary')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'binary'
                ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-extrabold'
                : 'text-[#8B98AA] hover:text-[#E8EDF5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Binary ({openBinary.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('forex')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'forex'
                ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-extrabold'
                : 'text-[#8B98AA] hover:text-[#E8EDF5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Forex ({forexPositions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-extrabold'
                : 'text-[#8B98AA] hover:text-[#E8EDF5]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trade Journal ({settledBinary.length + forexClosedTrades.length})</span>
          </button>
        </div>

        <span className="text-[11px] text-[#8B98AA]">Paper Trading Environment</span>
      </div>

      {/* Tab 1: Active Binary Contracts */}
      {activeTab === 'binary' && (
        <div className="overflow-x-auto">
          {openBinary.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8B98AA]">
              No active binary contracts. Open a CALL/PUT paper contract in the Binary Quant Engine.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-[#E8EDF5]">
              <thead className="bg-[#101722] text-[#8B98AA] uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3">Contract</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Stake</th>
                  <th className="px-4 py-3">Strike Price</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Potential Return</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {openBinary.map((order) => {
                  const now = Date.now();
                  const remainingSec = Math.max(0, Math.floor((order.expiryTime - now) / 1000));
                  const mins = Math.floor(remainingSec / 60);
                  const secs = remainingSec % 60;
                  const timeFormatted = `${mins}m ${secs}s`;

                  return (
                    <tr key={order.id} className="hover:bg-[#101722]/50">
                      <td className="px-4 py-3 font-bold">{order.symbol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            order.type === 'CALL' ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-[#FF4560]/20 text-[#FF4560]'
                          }`}
                        >
                          {order.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono-numbers">${order.stake.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono-numbers">{order.entryPrice.toFixed(5)}</td>
                      <td className="px-4 py-3">{order.durationMinutes}m</td>
                      <td className="px-4 py-3 font-mono-numbers text-[#00FF88] font-bold">
                        +${order.expectedProfit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00F3FF]/10 text-[#00F3FF] border border-[#00F3FF]/30 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 animate-spin" />
                          {timeFormatted} left
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Active Forex Positions */}
      {activeTab === 'forex' && (
        <div className="overflow-x-auto">
          {forexPositions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8B98AA]">
              No open Forex positions. Open a BUY/SELL paper position in the Forex AI Suite.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-[#E8EDF5]">
              <thead className="bg-[#101722] text-[#8B98AA] uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Lots</th>
                  <th className="px-4 py-3">Entry Price</th>
                  <th className="px-4 py-3">Current Price</th>
                  <th className="px-4 py-3">Pips</th>
                  <th className="px-4 py-3">Unrealized P/L</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {forexPositions.map((pos) => {
                  const isProfit = pos.unrealizedPnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[#101722]/50">
                      <td className="px-4 py-3 font-bold">{pos.symbol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            pos.type === 'BUY' ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-[#FF4560]/20 text-[#FF4560]'
                          }`}
                        >
                          {pos.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono-numbers">{pos.lots}</td>
                      <td className="px-4 py-3 font-mono-numbers">{pos.entryPrice.toFixed(5)}</td>
                      <td className="px-4 py-3 font-mono-numbers">{pos.currentPrice.toFixed(5)}</td>
                      <td className={`px-4 py-3 font-mono-numbers font-semibold ${isProfit ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                        {isProfit ? '+' : ''}{pos.pips}
                      </td>
                      <td className={`px-4 py-3 font-mono-numbers font-bold ${isProfit ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                        {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleCloseForex(pos.id)}
                          disabled={closingId === pos.id}
                          className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#FF4560] text-[#E8EDF5] hover:text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          {closingId === pos.id ? 'Closing...' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Trade Journal / History */}
      {activeTab === 'history' && (
        <div className="overflow-x-auto max-h-[350px]">
          {settledBinary.length === 0 && forexClosedTrades.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8B98AA]">
              No settled trades yet. Historical performance log will appear here after trades close.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-[#E8EDF5]">
              <thead className="bg-[#101722] text-[#8B98AA] uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Exit</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Realized P/L</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {settledBinary.map((b) => (
                  <tr key={b.id} className="hover:bg-[#101722]/50">
                    <td className="px-4 py-3 font-bold">{b.symbol} (Binary)</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${b.type === 'CALL' ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                        {b.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-numbers">{b.entryPrice.toFixed(5)}</td>
                    <td className="px-4 py-3 font-mono-numbers">{b.exitPrice?.toFixed(5) ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'WON' ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-[#FF4560]/20 text-[#FF4560]'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono-numbers font-bold ${(b.realizedPnl ?? 0) >= 0 ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                      {(b.realizedPnl ?? 0) >= 0 ? '+' : ''}${b.realizedPnl?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[#8B98AA]">{new Date(b.entryTime).toLocaleTimeString()}</td>
                  </tr>
                ))}

                {forexClosedTrades.map((f) => (
                  <tr key={f.id} className="hover:bg-[#101722]/50">
                    <td className="px-4 py-3 font-bold">{f.symbol} (Forex)</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${f.type === 'BUY' ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                        {f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-numbers">{f.entryPrice.toFixed(5)}</td>
                    <td className="px-4 py-3 font-mono-numbers">{f.exitPrice.toFixed(5)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.realizedPnl >= 0 ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-[#FF4560]/20 text-[#FF4560]'}`}>
                        {f.realizedPnl >= 0 ? 'PROFIT' : 'LOSS'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono-numbers font-bold ${f.realizedPnl >= 0 ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                      {f.realizedPnl >= 0 ? '+' : ''}${f.realizedPnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[#8B98AA]">{new Date(f.closeTime).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
