import React, { useState } from 'react';
import { api } from '../../services/apiClient.js';
import { ConnectionResult, MarketDataProviderConfig } from '../../types/market.js';
import { X, Server, Zap, CheckCircle2, XCircle, Shield, Key, Globe } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onProviderSaved: () => void;
}

export const APIManagerModal: React.FC<Props> = ({ isOpen, onClose, onProviderSaved }) => {
  const [providerName, setProviderName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!baseUrl) {
      alert('Please enter a REST Base URL to test');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testMarketProvider('custom_provider', apiKey || undefined, baseUrl);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Connection test failed',
        endpoint: baseUrl,
        timestamp: Date.now(),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName || !baseUrl) {
      alert('Provider Name and Base URL are required');
      return;
    }

    setSaving(true);
    try {
      const customId = `custom_${Date.now()}`;
      await api.saveMarketProvider({
        id: customId,
        baseUrl,
        wsUrl: wsUrl || undefined,
        apiKey: apiKey || undefined,
      });

      await api.setActiveMarketProvider(customId);
      onProviderSaved();
      onClose();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#070B10]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00F3FF]/10 text-[#00F3FF]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E8EDF5]">Configure Live Data Provider</h3>
              <p className="text-xs text-[#8B98AA]">Add and verify custom institutional REST/WebSocket endpoints</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8B98AA] hover:text-[#E8EDF5] hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAndActivate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-[#8B98AA] mb-1">
              Provider / Exchange Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., OANDA Institutional Live Feed"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3.5 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#8B98AA] mb-1 flex items-center justify-between">
              <span>REST Base URL (HTTPS)</span>
              <span className="text-[10px] text-[#00FF88] flex items-center gap-1">
                <Shield className="w-3 h-3" />
                SSRF Guarded
              </span>
            </label>
            <input
              type="url"
              required
              placeholder="https://api.yourbroker.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3.5 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#8B98AA] mb-1">
              WebSocket Stream URL (WSS, Optional)
            </label>
            <input
              type="text"
              placeholder="wss://stream.yourbroker.com/ws"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3.5 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#8B98AA] mb-1 flex items-center gap-1.5">
              <Key className="w-3 h-3 text-[#00F3FF]" />
              API Key / Auth Token (Encrypted Server-Side)
            </label>
            <input
              type="password"
              placeholder="Bearer Token or API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3.5 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88]'
                  : 'bg-[#FF4560]/10 border border-[#FF4560]/30 text-[#FF4560]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">{testResult.message}</div>
                <div className="text-[10px] opacity-80 mt-0.5">Roundtrip Latency: {testResult.latencyMs}ms</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !baseUrl}
              className="px-4 py-2 bg-[#101722] hover:bg-[#1E293B] text-xs font-bold text-[#E8EDF5] rounded-xl border border-[#1E293B] flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-4 h-4 text-[#00F3FF]" />
              <span>{testing ? 'Pinging...' : 'Test Connection'}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-[#00F3FF] to-[#00FF88] text-[#04060A] hover:brightness-110 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00F3FF]/20"
            >
              {saving ? 'Activating...' : 'Save & Route Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
