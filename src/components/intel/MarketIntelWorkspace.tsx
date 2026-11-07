import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { EconomicEvent, MarketNewsItem, CurrencyStrength } from '../../../server/intel/marketIntel.js';
import { Calendar, Globe2, Newspaper, TrendingUp, TrendingDown, ExternalLink, RefreshCw } from 'lucide-react';

export const MarketIntelWorkspace: React.FC = () => {
  const [calendar, setCalendar] = useState<EconomicEvent[]>([]);
  const [strength, setStrength] = useState<CurrencyStrength[]>([]);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntel = async () => {
    setLoading(true);
    try {
      const data = await api.getMarketIntel();
      setCalendar(data.economicCalendar);
      setStrength(data.currencyStrength);
      setNews(data.news);
    } catch (err) {
      console.error('Failed to load market intel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between bg-[#0B1018] border border-[#1E293B] p-4 rounded-xl gap-4">
        <div>
          <h2 className="text-base font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-[#00F3FF]" />
            Market Intelligence & Macroeconomic Sentiment
          </h2>
          <p className="text-xs text-[#8B98AA]">
            Real-time economic releases, currency relative strength matrix, and licensed financial news feeds
          </p>
        </div>

        <button
          type="button"
          onClick={fetchIntel}
          disabled={loading}
          className="px-3 py-1.5 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] rounded-lg text-xs font-semibold text-[#E8EDF5] flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00F3FF]' : ''}`} />
          <span>Refresh Feeds</span>
        </button>
      </div>

      {/* Currency Strength Matrix */}
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-2xl space-y-4">
        <h3 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00FF88]" />
          Real-Time Currency Relative Strength Matrix (0 - 10)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {strength.map((c) => {
            const isBullish = c.sentiment === 'BULLISH';
            const isBearish = c.sentiment === 'BEARISH';
            const barHeight = `${Math.min(100, Math.max(10, c.strength * 10))}%`;

            return (
              <div
                key={c.currency}
                className="p-3 bg-[#101722] border border-[#1E293B] rounded-xl flex flex-col items-center justify-between text-center space-y-2"
              >
                <span className="font-extrabold text-sm text-[#E8EDF5]">{c.currency}</span>

                <div className="w-full h-16 bg-[#0B1018] rounded-md p-1 flex items-end justify-center">
                  <div
                    style={{ height: barHeight }}
                    className={`w-6 rounded-t transition-all ${
                      isBullish ? 'bg-[#00FF88]' : isBearish ? 'bg-[#FF4560]' : 'bg-[#00F3FF]'
                    }`}
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="font-mono-numbers text-xs font-bold block text-[#E8EDF5]">{c.strength.toFixed(1)}</span>
                  <span
                    className={`text-[10px] font-bold block ${
                      isBullish ? 'text-[#00FF88]' : isBearish ? 'text-[#FF4560]' : 'text-[#8B98AA]'
                    }`}
                  >
                    {c.sentiment}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Economic Calendar & Financial News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economic Calendar */}
        <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-5 py-3 border-b border-[#1E293B] bg-[#070B10] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00F3FF]" />
              High-Impact Economic Calendar
            </h3>
            <span className="text-[11px] text-[#8B98AA]">UTC Time</span>
          </div>

          <div className="divide-y divide-[#1E293B] flex-1 overflow-y-auto max-h-[450px]">
            {calendar.map((item) => (
              <div key={item.id} className="p-4 hover:bg-[#101722]/60 transition-colors space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#00F3FF] font-mono-numbers">{item.time}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#101722] text-[#E8EDF5] font-bold text-[10px] border border-[#1E293B]">
                      {item.currency}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      item.impact === 'HIGH'
                        ? 'bg-[#FF4560]/20 text-[#FF4560] border border-[#FF4560]/30'
                        : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                    }`}
                  >
                    {item.impact} IMPACT
                  </span>
                </div>

                <div className="font-semibold text-xs text-[#E8EDF5]">{item.title}</div>

                <div className="flex items-center gap-4 text-[11px] text-[#8B98AA] pt-1">
                  <span>
                    Actual: <strong className="text-[#00FF88] font-mono-numbers">{item.actual}</strong>
                  </span>
                  <span>
                    Forecast: <strong className="text-[#E8EDF5] font-mono-numbers">{item.forecast}</strong>
                  </span>
                  <span>
                    Previous: <strong className="font-mono-numbers">{item.previous}</strong>
                  </span>
                </div>

                <div className="text-[10px] text-[#8B98AA] opacity-70">Source: {item.source}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial News */}
        <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-5 py-3 border-b border-[#1E293B] bg-[#070B10] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[#00FF88]" />
              Macroeconomic Market News & Sentiment
            </h3>
            <span className="text-[11px] text-[#00FF88]">Verified Feeds</span>
          </div>

          <div className="divide-y divide-[#1E293B] flex-1 overflow-y-auto max-h-[450px]">
            {news.map((n) => (
              <div key={n.id} className="p-4 hover:bg-[#101722]/60 transition-colors space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8B98AA]">{n.source} • {n.publishedAt}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      n.sentiment === 'BULLISH'
                        ? 'bg-[#00FF88]/20 text-[#00FF88]'
                        : n.sentiment === 'BEARISH'
                        ? 'bg-[#FF4560]/20 text-[#FF4560]'
                        : 'bg-[#8B98AA]/20 text-[#8B98AA]'
                    }`}
                  >
                    {n.sentiment}
                  </span>
                </div>

                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-xs text-[#E8EDF5] hover:text-[#00F3FF] transition-colors flex items-start justify-between gap-2 group"
                >
                  <span>{n.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#8B98AA] group-hover:text-[#00F3FF] flex-shrink-0 mt-0.5" />
                </a>

                <p className="text-xs text-[#8B98AA] line-clamp-2 leading-relaxed">{n.summary}</p>

                <div className="flex items-center gap-1.5 pt-1">
                  {n.relatedSymbols.map((sym) => (
                    <span
                      key={sym}
                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#101722] text-[#00F3FF] border border-[#1E293B] rounded"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
