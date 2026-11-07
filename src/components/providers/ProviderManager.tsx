import React, { useState, useEffect } from 'react';
import { MarketDataProviderConfig, ConnectionResult } from '../../types/market.js';
import { AIProviderConfig } from '../../types/ai.js';
import { api } from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Server,
  Cpu,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
  Key,
  Globe,
  RefreshCw,
  AlertTriangle,
  Bug,
  Terminal,
  Copy,
  Trash2,
  Play,
  Code,
  FileText,
} from 'lucide-react';

interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  symbol: string;
  timeframe: string;
  limit: number;
  httpStatus: number;
  statusText: string;
  latencyMs: number;
  rawPayload: any;
  validation: {
    valid: boolean;
    totalCount: number;
    validCount: number;
    hasOHLC: boolean;
    issues: string[];
  };
}

export const ProviderManager: React.FC = () => {
  const { user, saveMarketKey, saveAiKey, setActiveMarketProvider: setCloudMarketProvider, setActiveAiProvider: setCloudAiProvider } = useAuth();
  const [marketProviders, setMarketProviders] = useState<MarketDataProviderConfig[]>([]);
  const [aiProviders, setAiProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingMarketId, setTestingMarketId] = useState<string | null>(null);
  const [testingAiId, setTestingAiId] = useState<string | null>(null);
  const [marketTestResults, setMarketTestResults] = useState<Record<string, ConnectionResult>>({});
  const [aiTestResults, setAiTestResults] = useState<Record<string, { success: boolean; latencyMs: number; message: string; status: string }>>({});
  const [marketKeysInput, setMarketKeysInput] = useState<Record<string, string>>({});
  const [aiKeysInput, setAiKeysInput] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Raw API Diagnostic Tool State
  const [diagSymbol, setDiagSymbol] = useState('EUR/USD');
  const [diagTimeframe, setDiagTimeframe] = useState('5m');
  const [diagLimit, setDiagLimit] = useState(60);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLogEntry[]>([]);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const handleRunDiagnostic = async () => {
    setDiagRunning(true);
    try {
      console.log(`[Market Data Diagnostic] Requesting raw API response for ${diagSymbol} (${diagTimeframe}, limit: ${diagLimit})...`);
      const rawRes = await api.getRawMarketResponse(diagSymbol, diagTimeframe, diagLimit);

      // Log directly to browser console
      console.log('[Market Data Diagnostic] Raw HTTP Response Metadata:', {
        status: rawRes.status,
        statusText: rawRes.statusText,
        latencyMs: rawRes.latencyMs,
        headers: rawRes.headers,
      });
      console.log('[Market Data Diagnostic] Raw Body Payload:', rawRes.rawBody);

      // Perform OHLC presence validation
      const candlesArr = rawRes.rawBody?.data?.candles || rawRes.rawBody?.candles || [];
      const isArray = Array.isArray(candlesArr);
      const issues: string[] = [];
      let validCount = 0;

      if (!isArray) {
        issues.push('Response payload does not contain a valid array of candles');
      } else if (candlesArr.length === 0) {
        issues.push('Candles array is empty (0 records returned from provider)');
      } else {
        candlesArr.forEach((c: any, index: number) => {
          const hasTimestamp = typeof c?.timestamp === 'number' && !isNaN(c.timestamp);
          const hasOpen = typeof c?.open === 'number' && !isNaN(c.open);
          const hasHigh = typeof c?.high === 'number' && !isNaN(c.high);
          const hasLow = typeof c?.low === 'number' && !isNaN(c.low);
          const hasClose = typeof c?.close === 'number' && !isNaN(c.close);

          if (!hasTimestamp || !hasOpen || !hasHigh || !hasLow || !hasClose) {
            if (issues.length < 5) {
              issues.push(`Candle at index ${index} missing required OHLC numeric values`);
            }
          } else if (c.high < c.low) {
            issues.push(`Candle index ${index} invalid OHLC logic: high (${c.high}) < low (${c.low})`);
          } else {
            validCount++;
          }
        });
      }

      const entry: DiagnosticLogEntry = {
        id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        symbol: diagSymbol,
        timeframe: diagTimeframe,
        limit: diagLimit,
        httpStatus: rawRes.status,
        statusText: rawRes.statusText,
        latencyMs: rawRes.latencyMs,
        rawPayload: rawRes.rawBody,
        validation: {
          valid: isArray && candlesArr.length > 0 && validCount === candlesArr.length,
          totalCount: isArray ? candlesArr.length : 0,
          validCount,
          hasOHLC: validCount > 0,
          issues,
        },
      };

      setDiagnosticLogs((prev) => [entry, ...prev]);
    } catch (err: any) {
      console.error('[Market Data Diagnostic] Failed to run diagnostic:', err);
      const errorEntry: DiagnosticLogEntry = {
        id: `diag_err_${Date.now()}`,
        timestamp: Date.now(),
        symbol: diagSymbol,
        timeframe: diagTimeframe,
        limit: diagLimit,
        httpStatus: 500,
        statusText: 'CLIENT_ERROR',
        latencyMs: 0,
        rawPayload: { error: err?.message || 'Failed to fetch raw market response' },
        validation: {
          valid: false,
          totalCount: 0,
          validCount: 0,
          hasOHLC: false,
          issues: [err?.message || 'Network fetch error'],
        },
      };
      setDiagnosticLogs((prev) => [errorEntry, ...prev]);
    } finally {
      setDiagRunning(false);
    }
  };

  const handleCopyLogJson = (entry: DiagnosticLogEntry) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(entry.rawPayload, null, 2));
      setCopiedLogId(entry.id);
      setTimeout(() => setCopiedLogId(null), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const loadProviders = async () => {
    setLoading(true);
    try {
      const [mp, aip] = await Promise.all([api.getMarketProviders(), api.getAIProviders()]);
      setMarketProviders(mp);
      setAiProviders(aip);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleTestMarketProvider = async (provider: MarketDataProviderConfig) => {
    setTestingMarketId(provider.id);
    try {
      const key = marketKeysInput[provider.id] || provider.apiKey;
      const res = await api.testMarketProvider(provider.id, key, provider.baseUrl);
      setMarketTestResults((prev) => ({ ...prev, [provider.id]: res }));
    } catch (err: any) {
      setMarketTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: false,
          latencyMs: 0,
          message: err?.message || 'Connection test failed',
          endpoint: provider.baseUrl,
          timestamp: Date.now(),
        },
      }));
    } finally {
      setTestingMarketId(null);
    }
  };

  const handleTestAIProvider = async (ai: AIProviderConfig) => {
    setTestingAiId(ai.id);
    try {
      const key = aiKeysInput[ai.id];
      const res = await api.testAIProvider(ai.id, key);
      setAiTestResults((prev) => ({ ...prev, [ai.id]: res }));
    } catch (err: any) {
      setAiTestResults((prev) => ({
        ...prev,
        [ai.id]: {
          success: false,
          latencyMs: 0,
          message: err?.message || 'AI test failed',
          status: 'FAILED',
        },
      }));
    } finally {
      setTestingAiId(null);
    }
  };

  const handleSaveAIProvider = async (ai: AIProviderConfig) => {
    const key = aiKeysInput[ai.id];
    try {
      if (user && key) {
        await saveAiKey(ai.id, key);
      }
      await api.saveAIProvider({
        id: ai.id,
        name: ai.name,
        providerType: ai.providerType,
        activeModel: ai.activeModel,
        apiKey: key || undefined,
      });
      setSuccessMessage(`API Key configured and encrypted in cloud for ${ai.name}`);
      setTimeout(() => setSuccessMessage(null), 3500);
      loadProviders();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleSaveMarketProvider = async (provider: MarketDataProviderConfig) => {
    const key = marketKeysInput[provider.id];
    try {
      if (user && key) {
        await saveMarketKey(provider.id, key);
      }
      await api.saveMarketProvider({
        id: provider.id,
        apiKey: key || undefined,
        baseUrl: provider.baseUrl,
      });
      setSuccessMessage(`Credentials updated and saved permanently to cloud for ${provider.name}`);
      setTimeout(() => setSuccessMessage(null), 3500);
      loadProviders();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleSetActiveMarketProvider = async (providerId: string) => {
    try {
      if (user) {
        await setCloudMarketProvider(providerId);
      }
      await api.setActiveMarketProvider(providerId);
      loadProviders();
    } catch (err: any) {
      alert(`Failed to set active provider: ${err.message}`);
    }
  };

  const handleSetActiveAIProvider = async (providerId: string, modelId?: string) => {
    try {
      if (user) {
        await setCloudAiProvider(providerId, modelId);
      }
      await api.setActiveAIProvider(providerId, modelId);
    } catch (err: any) {
      alert(`Failed to switch AI provider: ${err.message}`);
    }
  };

  const getAiStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00FF88]/20 text-[#00FF88]">Connected</span>;
      case 'QUOTA_EXCEEDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B]">Quota Exceeded (429)</span>;
      case 'INVALID_KEY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF4560]/20 text-[#FF4560]">Invalid Key</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF4560]/20 text-[#FF4560]">Failed</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
            <Server className="w-5 h-5 text-[#00F3FF]" />
            Provider Manager & Multi-Feed Routing
          </h2>
          <p className="text-xs text-[#8B98AA]">
            Manually manage market feed API keys and multiple AI provider keys with automatic fallback
          </p>
        </div>

        <button
          type="button"
          onClick={loadProviders}
          className="px-3 py-1.5 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] rounded-lg text-xs font-semibold text-[#E8EDF5] flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00F3FF]' : ''}`} />
          <span>Reload Config</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl text-xs text-[#00FF88] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* SECTION 1: Market Data Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#00F3FF]" />
            Market Data Provider Management
          </h3>
          <span className="text-[11px] text-[#8B98AA]">SSRF & Rate-Limit Guarded</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketProviders.map((p) => {
            const testRes = marketTestResults[p.id];
            const isTesting = testingMarketId === p.id;

            return (
              <div
                key={p.id}
                className={`bg-[#0B1018] border rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                  p.isActive ? 'border-[#00F3FF] shadow-[#00F3FF]/10' : 'border-[#1E293B]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#E8EDF5]">{p.name}</span>
                      {p.isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#00F3FF]/20 text-[#00F3FF] border border-[#00F3FF]/40">
                          ACTIVE FEED
                        </span>
                      )}
                    </div>

                    <a
                      href={p.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8B98AA] hover:text-[#00F3FF]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-xs text-[#8B98AA] leading-relaxed">{p.rateLimitNote}</p>
                </div>

                {p.type !== 'binance_public' && (
                  <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
                    <label className="text-[11px] font-semibold uppercase text-[#8B98AA] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#00F3FF]" />
                        API Key
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter Provider API Key..."
                        value={marketKeysInput[p.id] || ''}
                        onChange={(e) => setMarketKeysInput({ ...marketKeysInput, [p.id]: e.target.value })}
                        className="flex-1 bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveMarketProvider(p)}
                        className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold rounded-lg text-[#E8EDF5]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {testRes && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      testRes.success
                        ? 'bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88]'
                        : 'bg-[#FF4560]/10 border border-[#FF4560]/30 text-[#FF4560]'
                    }`}
                  >
                    {testRes.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-semibold">{testRes.message}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Latency: {testRes.latencyMs}ms</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => handleTestMarketProvider(p)}
                    disabled={isTesting}
                    className="flex-1 py-2 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-bold text-[#E8EDF5] rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#00F3FF]" />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {!p.isActive && (
                    <button
                      type="button"
                      onClick={() => handleSetActiveMarketProvider(p.id)}
                      className="px-4 py-2 bg-[#00F3FF]/10 hover:bg-[#00F3FF] text-[#00F3FF] hover:text-[#04060A] border border-[#00F3FF]/40 rounded-lg text-xs font-bold"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: AI Provider Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#00FF88]" />
            AI Provider Management & Key Vault
          </h3>
          <span className="text-[11px] text-[#00FF88]">Automatic Fallback Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiProviders.map((ai) => {
            const aiTest = aiTestResults[ai.id];
            const isTesting = testingAiId === ai.id;

            return (
              <div
                key={ai.id}
                className={`bg-[#0B1018] border rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4 ${
                  ai.isActive ? 'border-[#00FF88] shadow-[#00FF88]/10' : 'border-[#1E293B]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#E8EDF5]">{ai.name}</span>
                      {ai.isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/40">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#8B98AA] leading-relaxed">{ai.rateLimitNote}</p>

                  <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
                    <label className="text-[11px] font-semibold uppercase text-[#8B98AA] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#00FF88]" />
                        Enter Free AI API Key
                      </span>
                      {ai.apiKeySet && <span className="text-[#00FF88] text-[10px] font-bold">● Key Stored</span>}
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Paste AI API Key..."
                        value={aiKeysInput[ai.id] || ''}
                        onChange={(e) => setAiKeysInput({ ...aiKeysInput, [ai.id]: e.target.value })}
                        className="flex-1 bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00FF88]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveAIProvider(ai)}
                        className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold rounded-lg text-[#E8EDF5]"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-semibold uppercase text-[#8B98AA] block mb-1">
                      Available Models
                    </label>
                    <select
                      value={ai.activeModel}
                      onChange={(e) => handleSetActiveAIProvider(ai.id, e.target.value)}
                      className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-[#E8EDF5] font-mono-numbers focus:outline-none focus:border-[#00FF88]"
                    >
                      {ai.availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {aiTest && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                      aiTest.success
                        ? 'bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88]'
                        : 'bg-[#FF4560]/10 border border-[#FF4560]/30 text-[#FF4560]'
                    }`}
                  >
                    <span className="font-semibold">{aiTest.message}</span>
                    {getAiStatusBadge(aiTest.status)}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => handleTestAIProvider(ai)}
                    disabled={isTesting}
                    className="flex-1 py-2 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-bold text-[#E8EDF5] rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#00FF88]" />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {!ai.isActive && (
                    <button
                      type="button"
                      onClick={() => handleSetActiveAIProvider(ai.id)}
                      className="px-3 py-2 bg-[#00FF88]/10 hover:bg-[#00FF88] text-[#00FF88] hover:text-[#04060A] border border-[#00FF88]/40 rounded-lg text-xs font-bold"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Raw Market API Diagnostic & Response Inspector Tool */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider flex items-center gap-2">
            <Bug className="w-4 h-4 text-[#00F3FF]" />
            Market Data Raw API Diagnostic & Inspector Tool
          </h3>
          <span className="text-[11px] text-[#8B98AA] flex items-center gap-1 font-mono-numbers">
            <Terminal className="w-3.5 h-3.5 text-[#00F3FF]" />
            Browser Console Sync Active
          </span>
        </div>

        <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-xl space-y-5">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8B98AA] uppercase mb-1">
                Target Symbol
              </label>
              <input
                type="text"
                value={diagSymbol}
                onChange={(e) => setDiagSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. BTC/USD"
                className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8B98AA] uppercase mb-1">
                Timeframe
              </label>
              <select
                value={diagTimeframe}
                onChange={(e) => setDiagTimeframe(e.target.value)}
                className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
              >
                <option value="1m">1 Minute (1m)</option>
                <option value="5m">5 Minutes (5m)</option>
                <option value="15m">15 Minutes (15m)</option>
                <option value="1h">1 Hour (1h)</option>
                <option value="1d">1 Day (1d)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8B98AA] uppercase mb-1">
                Candles Limit
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={diagLimit}
                onChange={(e) => setDiagLimit(Number(e.target.value))}
                className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={diagRunning}
                className="flex-1 py-2 bg-[#00F3FF] hover:bg-[#00FF88] text-[#04060A] text-xs font-black rounded-lg transition-all shadow-lg shadow-[#00F3FF]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{diagRunning ? 'Inspecting...' : 'Run Raw API Diagnostic'}</span>
              </button>

              {diagnosticLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDiagnosticLogs([])}
                  className="p-2 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] rounded-lg text-[#8B98AA] hover:text-[#FF4560]"
                  title="Clear Diagnostic Logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Console Sync Banner */}
          <div className="p-3 bg-[#101722] border border-[#1E293B] rounded-lg text-xs text-[#8B98AA] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#00F3FF]" />
              <span>
                Raw responses are captured, OHLC field presence is validated, and full JSON payloads are logged to the browser console.
              </span>
            </span>
            <span className="text-[10px] text-[#00FF88] font-mono-numbers">
              {diagnosticLogs.length} diagnostic run(s)
            </span>
          </div>

          {/* Diagnostic Log Cards */}
          <div className="space-y-4">
            {diagnosticLogs.map((log) => (
              <div
                key={log.id}
                className="border border-[#1E293B] rounded-xl bg-[#070B10] p-4 space-y-3 font-sans text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#E8EDF5]">{log.symbol}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#101722] border border-[#1E293B] text-[10px] text-[#00F3FF] font-mono-numbers">
                      {log.timeframe} ({log.limit} limit)
                    </span>
                    <span className="text-[10px] text-[#8B98AA] font-mono-numbers">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono-numbers text-[11px] text-[#8B98AA]">
                      {log.latencyMs}ms
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black font-mono-numbers ${
                        log.httpStatus === 200
                          ? 'bg-[#00FF88]/20 text-[#00FF88]'
                          : 'bg-[#FF4560]/20 text-[#FF4560]'
                      }`}
                    >
                      HTTP {log.httpStatus} {log.statusText}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyLogJson(log)}
                      className="px-2 py-1 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] rounded text-[10px] font-semibold text-[#E8EDF5] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3 text-[#00F3FF]" />
                      <span>{copiedLogId === log.id ? 'Copied!' : 'Copy Raw JSON'}</span>
                    </button>
                  </div>
                </div>

                {/* Validation Status Badge & Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-[#0B1018] border border-[#1E293B]">
                    <span className="text-[10px] text-[#8B98AA] font-bold block uppercase">OHLC Data Integrity</span>
                    <span
                      className={`text-xs font-black flex items-center gap-1.5 mt-0.5 ${
                        log.validation.valid
                          ? 'text-[#00FF88]'
                          : log.validation.hasOHLC
                          ? 'text-[#F59E0B]'
                          : 'text-[#FF4560]'
                      }`}
                    >
                      {log.validation.valid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Valid OHLC Data
                        </>
                      ) : log.validation.hasOHLC ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" /> Partial / Mixed OHLC
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Validation Failed
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B1018] border border-[#1E293B]">
                    <span className="text-[10px] text-[#8B98AA] font-bold block uppercase">Candle Records</span>
                    <span className="text-xs font-mono-numbers font-extrabold text-[#E8EDF5] mt-0.5 block">
                      {log.validation.validCount} valid / {log.validation.totalCount} returned
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B1018] border border-[#1E293B]">
                    <span className="text-[10px] text-[#8B98AA] font-bold block uppercase">Source Provider</span>
                    <span className="text-xs font-bold text-[#00F3FF] mt-0.5 block truncate">
                      {log.rawPayload?.data?.source || log.rawPayload?.source || 'Public Feed'}
                    </span>
                  </div>
                </div>

                {/* Validation Issues / Diagnostics */}
                {log.validation.issues.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-[#FF4560]/10 border border-[#FF4560]/30 text-xs text-[#FF4560] space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Identified OHLC Validation Issues:
                    </span>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {log.validation.issues.map((iss, idx) => (
                        <li key={idx}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Raw JSON Code Preview */}
                <div className="relative">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#8B98AA] uppercase mb-1">
                    <span className="flex items-center gap-1">
                      <Code className="w-3 h-3 text-[#00F3FF]" /> Raw JSON Payload
                    </span>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#04060A] border border-[#1E293B] text-[11px] font-mono font-mono-numbers text-[#00FF88] max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(log.rawPayload, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
