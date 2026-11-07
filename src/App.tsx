import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/apiClient.js';
import { Candle, MarketSymbol, MarketTick, Timeframe } from './types/market.js';
import { TradingAccountState, BinaryOrder, ForexPosition, ForexClosedTrade } from './types/trading.js';
import { AISignalResult, TradingMode } from './types/ai.js';
import { TradingViewChart } from './components/charts/TradingViewChart.js';
import { MarketWatch } from './components/trading/MarketWatch.js';
import { SignalBrain } from './components/ai/SignalBrain.js';
import { AIMarketMonitorPanel } from './components/ai/AIMarketMonitorPanel.js';
import { BinaryQuantEngine } from './components/trading/BinaryQuantEngine.js';
import { ForexAISuite } from './components/trading/ForexAISuite.js';
import { PositionsAndHistory } from './components/trading/PositionsAndHistory.js';
import { BacktestWorkspace } from './components/backtest/BacktestWorkspace.js';
import { MarketIntelWorkspace } from './components/intel/MarketIntelWorkspace.js';
import { ProviderManager } from './components/providers/ProviderManager.js';
import { SettingsWorkspace } from './components/settings/SettingsWorkspace.js';
import { APIManagerModal } from './components/modals/APIManagerModal.js';
import { NotificationCenter } from './components/modals/NotificationCenter.js';
import { useAuth } from './context/AuthContext.js';
import { AuthModal } from './components/auth/AuthModal.js';
import {
  Activity,
  Zap,
  TrendingUp,
  BarChart2,
  Globe,
  Key,
  Settings,
  Shield,
  Layers,
  Clock,
  PlusCircle,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

export default function App() {
  const { user, getAuthToken, saveStatus } = useAuth();

  // Navigation & Workspace State
  const [activeTab, setActiveTab] = useState<'binary' | 'forex' | 'backtest' | 'intel' | 'providers' | 'settings'>('binary');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const syncToken = async () => {
      const token = await getAuthToken();
      api.setAuthToken(token);
    };
    syncToken();
  }, [user, getAuthToken]);

  // Market & Trading State
  const [symbols, setSymbols] = useState<MarketSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [tradingMode, setTradingMode] = useState<TradingMode>('binary');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketTick>>({});
  const [currentQuote, setCurrentQuote] = useState<MarketTick | null>(null);
  const [sourceName, setSourceName] = useState<string>('Live Institutional Stream');

  // Account & Positions State
  const [account, setAccount] = useState<TradingAccountState>({
    balance: 10000.0,
    currency: 'USD',
    initialBalance: 10000.0,
    equity: 10000.0,
    marginUsed: 0,
    freeMargin: 10000.0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    dailyLossToday: 0,
    maxDailyLoss: 500,
    maxStake: 500,
    maxOpenTrades: 5,
    isBrokerMode: false,
  });
  const [binaryOrders, setBinaryOrders] = useState<BinaryOrder[]>([]);
  const [forexPositions, setForexPositions] = useState<ForexPosition[]>([]);
  const [forexClosedTrades, setForexClosedTrades] = useState<ForexClosedTrade[]>([]);

  // Time State
  const [utcTime, setUtcTime] = useState<string>('');

  // Prefill state from AI signal for one-click trading
  const [prefillSL, setPrefillSL] = useState<number | undefined>();
  const [prefillTP, setPrefillTP] = useState<number | undefined>();

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial symbols from connected provider API
  useEffect(() => {
    const initSymbols = async () => {
      try {
        const syms = await api.getSymbols();
        setSymbols(syms);
        if (syms && syms.length > 0) {
          setSelectedSymbol((prev) => (prev && syms.some((s) => s.symbol === prev) ? prev : syms[0].symbol));
        } else {
          setSelectedSymbol('');
        }
      } catch (err) {
        console.error('Error fetching symbols:', err);
        setSymbols([]);
        setSelectedSymbol('');
      }
    };
    initSymbols();
  }, []);

  // Fetch candles on symbol or timeframe change
  const fetchCandleData = useCallback(async () => {
    if (!selectedSymbol) {
      setCandles([]);
      setSourceName('No Market Data Provider Active');
      return;
    }
    try {
      const data = await api.getCandles(selectedSymbol, timeframe, 60);
      setCandles(data.candles || []);
      setSourceName(data.source || 'Market Data Feed');
    } catch (err) {
      console.error('Error fetching candles:', err);
      setCandles([]);
      setSourceName('Provider Disconnected / Error');
    }
  }, [selectedSymbol, timeframe]);

  useEffect(() => {
    fetchCandleData();
    const interval = setInterval(fetchCandleData, 5000); // Poll fresh candles
    return () => clearInterval(interval);
  }, [fetchCandleData]);

  // Fetch live quotes for selected symbol and watchlist
  const fetchQuotes = useCallback(async () => {
    if (!selectedSymbol) {
      setCurrentQuote(null);
      return;
    }
    try {
      const q = await api.getQuote(selectedSymbol);
      setCurrentQuote(q);
      setQuotes((prev) => ({ ...prev, [selectedSymbol]: q }));

      // Also refresh positions & account balance
      const posData = await api.getPaperPositions();
      setBinaryOrders(posData.binaryOrders);
      setForexPositions(posData.forexPositions);
      setForexClosedTrades(posData.forexClosedTrades);
      setAccount(posData.account);
    } catch (err) {
      console.error('Error fetching quote:', err);
      setCurrentQuote(null);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 2000); // 2s live quote ticker
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
  };

  const handleExecutePaperTradeFromSignal = (sig: AISignalResult) => {
    if (sig.mode === 'binary') {
      setActiveTab('binary');
    } else {
      setActiveTab('forex');
      setPrefillSL(sig.stopLoss);
      setPrefillTP(sig.takeProfit);
    }
  };

  return (
    <div className="min-h-screen bg-[#04060A] text-[#E8EDF5] flex flex-col font-sans selection:bg-[#00F3FF]/20 selection:text-[#00F3FF]">
      {/* ------------------------------------------------------------------ */}
      {/* TOP INSTITUTIONAL HEADER BAR                                       */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 bg-[#070B10]/95 backdrop-blur-md border-b border-[#1E293B]">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00F3FF] to-[#00FF88] p-0.5 flex items-center justify-center shadow-lg shadow-[#00F3FF]/20">
              <div className="w-full h-full bg-[#04060A] rounded-[6px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#00F3FF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider uppercase text-[#E8EDF5]">
                  Obsidian Quant AI
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#00F3FF]/20 text-[#00F3FF] border border-[#00F3FF]/30">
                  PRO MASTER
                </span>
              </div>
              <span className="text-[10px] text-[#8B98AA] hidden sm:block">Institutional Terminal V2.1</span>
            </div>
          </div>

          {/* Center: Live Ticker & Market Feed Status */}
          <div className="hidden lg:flex items-center gap-6 text-xs">
            {/* Active Symbol & Price */}
            <div className="flex items-center gap-3 bg-[#0B1018] px-3.5 py-1.5 rounded-lg border border-[#1E293B]">
              <span className="font-extrabold text-[#E8EDF5]">{selectedSymbol || 'No Asset Selected'}</span>
              <span className="font-mono-numbers font-black text-sm text-[#00FF88]">
                {currentQuote ? currentQuote.price.toFixed(selectedSymbol.includes('JPY') ? 3 : selectedSymbol.includes('BTC') ? 2 : 5) : '—'}
              </span>
              <span className={`font-mono-numbers text-[11px] font-bold ${(currentQuote?.change24h ?? 0) >= 0 ? 'text-[#00FF88]' : 'text-[#FF4560]'}`}>
                {currentQuote && typeof currentQuote.change24h === 'number' ? `${currentQuote.change24h >= 0 ? '+' : ''}${currentQuote.change24h}%` : '—'}
              </span>
            </div>

            {/* Provider Source Badge */}
            <div className="flex items-center gap-1.5 bg-[#0B1018] px-3 py-1.5 rounded-lg border border-[#1E293B] text-[11px] text-[#8B98AA]">
              <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
              <span>Feed:</span>
              <span className="font-bold text-[#E8EDF5]">{sourceName}</span>
            </div>

            {/* Paper Trading Mode Badge */}
            <div className="flex items-center gap-1.5 bg-[#0B1018] px-3 py-1.5 rounded-lg border border-[#1E293B] text-[11px]">
              <Shield className="w-3.5 h-3.5 text-[#00F3FF]" />
              <span className="text-[#8B98AA]">Mode:</span>
              <span className="font-bold text-[#00F3FF]">PAPER TRADING</span>
            </div>
          </div>

          {/* Right: Account Balance & Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Paper Capital Indicator */}
            <div className="text-right bg-[#0B1018] px-3 py-1 rounded-lg border border-[#1E293B]">
              <span className="text-[10px] text-[#8B98AA] uppercase font-bold block">Paper Equity</span>
              <span className="font-mono-numbers text-xs sm:text-sm font-black text-[#00FF88]">
                ${account.equity.toFixed(2)}
              </span>
            </div>

            {/* User Account / Cloud Login Button */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101722] hover:bg-[#1E293B] border border-[#00F3FF]/40 text-[#00F3FF] rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Cloud Account & Key Vault"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="max-w-[110px] truncate hidden sm:inline font-mono">
                {user ? user.email?.split('@')[0] : 'Sign In'}
              </span>
              {saveStatus === 'saving' && <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />}
              {saveStatus === 'saved' && <span className="w-2 h-2 rounded-full bg-[#00FF88]" />}
            </button>

            {/* Notification Center & Web Notifications Bell */}
            <NotificationCenter />

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[#8B98AA] hover:text-[#E8EDF5] bg-[#101722] rounded-lg border border-[#1E293B]"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="border-t border-[#1E293B] bg-[#04060A]/80 overflow-x-auto">
          <div className="w-full max-w-[1920px] mx-auto px-4 flex items-center gap-1 py-1">
            <button
              type="button"
              onClick={() => setActiveTab('binary')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'binary'
                  ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-black'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#101722]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ Binary Quant Engine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('forex')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'forex'
                  ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-black'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#101722]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>📈 Professional Forex AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('backtest')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'backtest'
                  ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-black'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#101722]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>📊 Backtest Quant Engine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('intel')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'intel'
                  ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-black'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#101722]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>🌐 Market Intel & Sentiment</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('providers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'providers'
                  ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-black'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#101722]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>🔑 Provider Manager</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-[#00F3FF] text-[#04060A] shadow-md shadow-[#00F3FF]/20 font-black'
                  : 'text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#101722]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Risk & Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN VIEWPORT CONTENT                                              */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-5 space-y-6">
        {/* WORKSPACE 1 & 2: DUAL-ENGINE TRADING TERMINAL */}
        {(activeTab === 'binary' || activeTab === 'forex') && (
          <div className="space-y-6">
            {/* Core Trading Terminal Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Market Watch (3 cols on desktop) */}
              <div className="lg:col-span-3 h-full">
                <MarketWatch
                  symbols={symbols}
                  quotes={quotes}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={handleSelectSymbol}
                />
              </div>

              {/* Center Column: TradingView Lightweight Candlestick Chart (6 cols) */}
              <div className="lg:col-span-6 space-y-5">
                <TradingViewChart
                  symbol={selectedSymbol}
                  candles={candles}
                  timeframe={timeframe}
                  onTimeframeChange={(tf) => setTimeframe(tf)}
                  currentPrice={currentQuote?.price}
                  sourceName={sourceName}
                />

                {/* Sub-Panel: Dedicated Execution Suite matching active tab */}
                {activeTab === 'binary' ? (
                  <BinaryQuantEngine
                    symbol={selectedSymbol}
                    currentPrice={currentQuote?.price}
                    onOrderPlaced={fetchQuotes}
                    payoutRate={0.85}
                  />
                ) : (
                  <ForexAISuite
                    symbol={selectedSymbol}
                    currentPrice={currentQuote?.price}
                    accountBalance={account.balance}
                    onOrderPlaced={fetchQuotes}
                    prefillSL={prefillSL}
                    prefillTP={prefillTP}
                  />
                )}
              </div>

              {/* Right Column: AI Live Monitor & Signal Brain (3 cols) */}
              <div className="lg:col-span-3 space-y-5">
                <AIMarketMonitorPanel symbol={selectedSymbol} timeframe={timeframe} />
                <SignalBrain
                  selectedSymbol={selectedSymbol}
                  onSymbolChange={handleSelectSymbol}
                  timeframe={timeframe}
                  onTimeframeChange={(tf) => setTimeframe(tf as Timeframe)}
                  mode={activeTab === 'binary' ? 'binary' : 'forex'}
                  onModeChange={(m) => {
                    setTradingMode(m);
                    setActiveTab(m);
                  }}
                  onExecutePaperTrade={handleExecutePaperTradeFromSignal}
                  symbols={symbols}
                />
              </div>
            </div>

            {/* Bottom Row: Positions, Active Contracts & Trade Journal */}
            <PositionsAndHistory
              binaryOrders={binaryOrders}
              forexPositions={forexPositions}
              forexClosedTrades={forexClosedTrades}
              onPositionUpdated={fetchQuotes}
            />
          </div>
        )}

        {/* WORKSPACE 3: BACKTEST QUANT ENGINE */}
        {activeTab === 'backtest' && <BacktestWorkspace />}

        {/* WORKSPACE 4: MARKET INTEL & SENTIMENT */}
        {activeTab === 'intel' && <MarketIntelWorkspace />}

        {/* WORKSPACE 5: PROVIDER & AI MANAGER */}
        {activeTab === 'providers' && <ProviderManager />}

        {/* WORKSPACE 6: RISK GOVERNANCE & SETTINGS */}
        {activeTab === 'settings' && <SettingsWorkspace />}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* CUSTOM DATA PROVIDER MODAL                                         */}
      {/* ------------------------------------------------------------------ */}
      <APIManagerModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        onProviderSaved={() => {
          fetchCandleData();
          fetchQuotes();
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* AUTHENTICATION & CLOUD ACCOUNT MODAL                               */}
      {/* ------------------------------------------------------------------ */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER & STATUS BAR                                                */}
      {/* ------------------------------------------------------------------ */}
      <footer className="mt-auto border-t border-[#1E293B] bg-[#070B10] px-4 py-3 text-xs text-[#8B98AA]">
        <div className="w-full max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
              System Status: <strong className="text-[#E8EDF5]">OPERATIONAL</strong>
            </span>
            <span className="hidden sm:inline">Engine: Obsidian Quant V2.1 Pro</span>
            <span className="hidden md:inline">Paper Simulation Mode</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] opacity-75">
              Advisory intelligence only. No real money broker execution without documented adapter.
            </span>
            <span className="text-[#00F3FF]">PRO MASTER EDITION</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
