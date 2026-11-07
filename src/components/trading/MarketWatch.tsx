import React, { useState } from 'react';
import { MarketSymbol, MarketTick } from '../../types/market.js';
import { Search, TrendingUp, TrendingDown, Star } from 'lucide-react';

interface Props {
  symbols: MarketSymbol[];
  quotes: Record<string, MarketTick>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MarketWatch: React.FC<Props> = ({
  symbols,
  quotes,
  selectedSymbol,
  onSelectSymbol,
}) => {
  const [filter, setFilter] = useState<'all' | 'forex' | 'crypto' | 'commodity'>('all');
  const [search, setSearch] = useState('');

  const filteredSymbols = symbols.filter((s) => {
    const matchesCategory = filter === 'all' || s.category === filter;
    const matchesSearch =
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1E293B] bg-[#070B10] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F3FF] animate-pulse" />
            Market Watch
          </h3>
          <span className="text-[11px] text-[#8B98AA] font-mono-numbers">{symbols.length} Assets</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8B98AA] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search pair or asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#101722] border border-[#1E293B] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#E8EDF5] placeholder-[#8B98AA]/60 focus:outline-none focus:border-[#00F3FF]"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-[#101722] p-1 rounded-lg border border-[#1E293B]">
          {(['all', 'forex', 'crypto', 'commodity'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-1 py-1 text-[11px] font-semibold capitalize rounded transition-all ${
                filter === cat
                  ? 'bg-[#00F3FF] text-[#04060A] font-bold shadow'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol List Table */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]/40 max-h-[500px]">
        {filteredSymbols.map((item) => {
          const q = quotes[item.symbol];
          const isSelected = selectedSymbol === item.symbol;
          const isPositive = (q?.change24h ?? 0) >= 0;

          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelectSymbol(item.symbol)}
              className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                isSelected ? 'bg-[#00F3FF]/10 border-l-2 border-[#00F3FF]' : 'hover:bg-[#101722]/60'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-[#E8EDF5]">{item.symbol}</span>
                  <span className="text-[10px] text-[#8B98AA] uppercase px-1 py-0.2 rounded bg-[#101722] border border-[#1E293B]">
                    {item.category}
                  </span>
                </div>
                <div className="text-[11px] text-[#8B98AA] truncate max-w-[130px]">{item.name}</div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="font-mono-numbers text-xs font-bold text-[#E8EDF5]">
                  {q ? q.price.toFixed(item.decimals) : '—'}
                </div>
                <div
                  className={`flex items-center justify-end gap-1 font-mono-numbers text-[11px] font-semibold ${
                    isPositive ? 'text-[#00FF88]' : 'text-[#FF4560]'
                  }`}
                >
                  {q ? (
                    <>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{`${isPositive ? '+' : ''}${q.change24h}%`}</span>
                    </>
                  ) : (
                    <span className="text-[#8B98AA] font-normal text-[10px]">Pending Quote</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredSymbols.length === 0 && (
          <div className="p-6 text-center text-xs text-[#8B98AA] space-y-2">
            <p className="font-semibold text-[#E8EDF5]">0 Assets Discovered</p>
            <p className="text-[11px]">
              No accessible instruments returned by the connected market data provider. Please configure a valid API Key in the Provider Manager.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
