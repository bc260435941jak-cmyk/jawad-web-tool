import React, { useState, useEffect } from 'react';
import { MarketDataProviderConfig, ConnectionResult } from '../../types/market.js';
import { AIProviderConfig } from '../../types/ai.js';
import { api } from '../../services/apiClient.js';
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
} from 'lucide-react';

export const ProviderManager: React.FC = () => {
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
      await api.saveAIProvider({
        id: ai.id,
        name: ai.name,
        providerType: ai.providerType,
        activeModel: ai.activeModel,
        apiKey: key || undefined,
      });
      setSuccessMessage(`API Key configured and stored securely for ${ai.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      loadProviders();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleSaveMarketProvider = async (provider: MarketDataProviderConfig) => {
    const key = marketKeysInput[provider.id];
    try {
      await api.saveMarketProvider({
        id: provider.id,
        apiKey: key || undefined,
        baseUrl: provider.baseUrl,
      });
      setSuccessMessage(`Credentials updated for ${provider.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      loadProviders();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleSetActiveMarketProvider = async (providerId: string) => {
    try {
      await api.setActiveMarketProvider(providerId);
      loadProviders();
    } catch (err: any) {
      alert(`Failed to set active provider: ${err.message}`);
    }
  };

  const handleSetActiveAIProvider = async (providerId: string, modelId?: string) => {
    try {
      await api.setActiveAIProvider(providerId, modelId);
      loadProviders();
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
    </div>
  );
};
