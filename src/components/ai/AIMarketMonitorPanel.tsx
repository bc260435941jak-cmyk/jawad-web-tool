import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { Brain, Sparkles, Activity, ShieldCheck, Clock } from 'lucide-react';

interface Props {
  symbol: string;
  timeframe: string;
}

export const AIMarketMonitorPanel: React.FC<Props> = ({ symbol, timeframe }) => {
  const [commentary, setCommentary] = useState<string>('Initializing AI market surveillance on completed candle formations...');
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchMonitor = async () => {
    setLoading(true);
    try {
      const res = await api.getAIMonitor(symbol, timeframe);
      setCommentary(res.commentary);
      setLastUpdated(new Date(res.timestamp).toLocaleTimeString());
    } catch (err) {
      console.warn('AI monitor update warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 12000); // Efficient schedule, not hammering on every tick
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  return (
    <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#00F3FF]/10 text-[#00F3FF]">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-1.5">
              <span>AI Live Market Monitor</span>
              <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
            </h4>
            <p className="text-[10px] text-[#8B98AA]">Continuous candle-close surveillance & reasoning</p>
          </div>
        </div>

        {lastUpdated && (
          <span className="text-[10px] text-[#8B98AA] font-mono-numbers flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#00F3FF]" />
            {lastUpdated}
          </span>
        )}
      </div>

      <div className="p-3 bg-[#101722] rounded-lg border border-[#1E293B] text-xs text-[#E8EDF5] leading-relaxed flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-[#00F3FF] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#00F3FF]">Live Surveillance Note:</span>
          <p className="mt-1 text-[#8B98AA]">{commentary}</p>
        </div>
      </div>
    </div>
  );
};
