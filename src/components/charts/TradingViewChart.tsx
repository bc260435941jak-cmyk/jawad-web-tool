import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CandlestickSeries,
  LineSeries,
  Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import { Candle, Timeframe } from '../../types/market.js';
import { calculateSMA, calculateEMA } from '../../utils/indicators.js';
import { Activity, Clock } from 'lucide-react';

interface Props {
  symbol: string;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  currentPrice?: number;
  sourceName?: string;
}

export const TradingViewChart: React.FC<Props> = ({
  symbol,
  candles,
  timeframe,
  onTimeframeChange,
  currentPrice,
  sourceName,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [secondsToClose, setSecondsToClose] = useState(60);

  // Timeframe candle countdown calculation
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const tfMinutes = timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440;
      const intervalMs = tfMinutes * 60 * 1000;
      const nextCandleTime = Math.ceil(now / intervalMs) * intervalMs;
      const diffSec = Math.max(0, Math.floor((nextCandleTime - now) / 1000));
      setSecondsToClose(diffSec);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // Format seconds to mm:ss
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize TradingView Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: '#0B1018' },
        textColor: '#8B98AA',
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#00F3FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#00F3FF',
        },
        horzLine: {
          color: '#00F3FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#00F3FF',
        },
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    chartInstanceRef.current = chart;

    // Candlestick series with institutional neon/dark colors
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00FF88',
      downColor: '#FF4560',
      borderVisible: false,
      wickUpColor: '#00FF88',
      wickDownColor: '#FF4560',
    });
    candleSeriesRef.current = candleSeries;

    // Moving average indicators
    const smaSeries = chart.addSeries(LineSeries, {
      color: '#00F3FF',
      lineWidth: 2,
      title: 'SMA 20',
    });
    smaSeriesRef.current = smaSeries;

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#F59E0B',
      lineWidth: 2,
      title: 'EMA 20',
    });
    emaSeriesRef.current = emaSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, []);

  // Update chart data whenever candles or indicators change
  useEffect(() => {
    if (!candleSeriesRef.current || !candles || candles.length === 0) return;

    // Sort by timestamp and deduplicate
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    const uniqueMap = new Map<number, Candle>();
    sorted.forEach((c) => uniqueMap.set(c.timestamp, c));
    const cleanCandles = Array.from(uniqueMap.values());

    const chartData: CandlestickData<Time>[] = cleanCandles.map((c) => ({
      time: (Math.floor(c.timestamp / 1000)) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    try {
      candleSeriesRef.current.setData(chartData);

      // Compute & update SMA series
      if (smaSeriesRef.current) {
        if (showSMA && cleanCandles.length >= 20) {
          const smaData: { time: Time; value: number }[] = [];
          const closes = cleanCandles.map((c) => c.close);
          for (let i = 19; i < cleanCandles.length; i++) {
            const sma = calculateSMA(closes.slice(0, i + 1), 20);
            if (sma !== null) {
              smaData.push({
                time: (Math.floor(cleanCandles[i].timestamp / 1000)) as Time,
                value: sma,
              });
            }
          }
          smaSeriesRef.current.setData(smaData);
          smaSeriesRef.current.applyOptions({ visible: true });
        } else {
          smaSeriesRef.current.applyOptions({ visible: false });
        }
      }

      // Compute & update EMA series
      if (emaSeriesRef.current) {
        if (showEMA && cleanCandles.length >= 20) {
          const emaData: { time: Time; value: number }[] = [];
          const closes = cleanCandles.map((c) => c.close);
          for (let i = 19; i < cleanCandles.length; i++) {
            const ema = calculateEMA(closes.slice(0, i + 1), 20);
            if (ema !== null) {
              emaData.push({
                time: (Math.floor(cleanCandles[i].timestamp / 1000)) as Time,
                value: ema,
              });
            }
          }
          emaSeriesRef.current.setData(emaData);
          emaSeriesRef.current.applyOptions({ visible: true });
        } else {
          emaSeriesRef.current.applyOptions({ visible: false });
        }
      }

      // Fit chart view
      chartInstanceRef.current?.timeScale().fitContent();
    } catch (err) {
      console.warn('Chart series update warning:', err);
    }
  }, [candles, showSMA, showEMA]);

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <div className="flex flex-col bg-[#0B1018] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-[#1E293B] bg-[#070B10] gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-[#E8EDF5]">{symbol}</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#00F3FF]/10 text-[#00F3FF] border border-[#00F3FF]/30">
              {timeframe.toUpperCase()}
            </span>
          </div>

          {currentPrice && (
            <div className="flex items-center gap-2 pl-3 border-l border-[#1E293B]">
              <span className="text-sm text-[#8B98AA]">Live:</span>
              <span className="font-mono-numbers text-base font-semibold text-[#00FF88]">
                {currentPrice.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') ? 2 : 5)}
              </span>
            </div>
          )}

          {sourceName && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-[#8B98AA] bg-[#101722] rounded border border-[#1E293B]">
              <Activity className="w-3 h-3 text-[#00F3FF]" />
              {sourceName}
            </span>
          )}
        </div>

        {/* Timeframe Selectors & Indicator Toggles */}
        <div className="flex items-center gap-3">
          {/* Timeframe Buttons */}
          <div className="flex items-center bg-[#101722] p-1 rounded-lg border border-[#1E293B]">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                  timeframe === tf
                    ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-bold'
                    : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#1E293B]/50'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#101722] px-2 py-1 rounded-lg border border-[#1E293B]">
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                showSMA ? 'text-[#00F3FF] bg-[#00F3FF]/10' : 'text-[#8B98AA] opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#00F3FF]" />
              SMA 20
            </button>
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                showEMA ? 'text-[#F59E0B] bg-[#F59E0B]/10' : 'text-[#8B98AA] opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              EMA 20
            </button>
          </div>

          {/* Candle Close Countdown */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#101722] text-[#E8EDF5] border border-[#1E293B] rounded-lg">
            <Clock className="w-3.5 h-3.5 text-[#00F3FF] animate-pulse" />
            <span className="text-xs text-[#8B98AA]">Bar Close:</span>
            <span className="font-mono-numbers text-xs font-bold text-[#00F3FF]">{formatCountdown(secondsToClose)}</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative w-full h-[480px]">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Footer Attribution / License Requirement */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#1E293B] bg-[#070B10] text-[11px] text-[#8B98AA]">
        <div className="flex items-center gap-4">
          <span>Candles: {candles.length} bars loaded</span>
          <span>Interval: {timeframe}</span>
          <span className="text-[#00FF88]">● Live Feed Active</span>
        </div>
        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
          <span>Powered by</span>
          <a
            href="https://tradingview.github.io/lightweight-charts/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00F3FF] hover:underline"
          >
            TradingView Lightweight Charts™
          </a>
        </div>
      </div>
    </div>
  );
};
