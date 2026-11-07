import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { RiskSettings, TradingAccountState } from '../../types/trading.js';
import { Shield, RefreshCw, AlertTriangle, CheckCircle2, Download, Lock, Check } from 'lucide-react';

export const SettingsWorkspace: React.FC = () => {
  const [settings, setSettings] = useState<RiskSettings>({
    maxStake: 250,
    dailyLossLimit: 500,
    maxOpenPositions: 5,
    defaultTimeframe: '5m',
    defaultPayoutRate: 0.85,
    slippagePips: 0.2,
  });
  const [account, setAccount] = useState<TradingAccountState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data.riskSettings);
        setAccount(data.account);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetBalance = async () => {
    if (!window.confirm('Reset paper balance back to $10,000.00 and clear order history?')) return;
    try {
      const updated = await api.resetPaperAccount();
      setAccount(updated);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reset account:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#E8EDF5] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00F3FF]" />
            Risk Governance & Terminal Settings
          </h2>
          <p className="text-xs text-[#8B98AA]">
            Enforce mandatory risk constraints, maximum drawdowns, and paper account parameters
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl text-xs text-[#00FF88] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Risk parameters and settings updated successfully.</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-3 bg-[#00F3FF]/10 border border-[#00F3FF]/30 rounded-xl text-xs text-[#00F3FF] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Paper trading balance successfully reset to $10,000.00.</span>
        </div>
      )}

      {/* Risk Limits Form */}
      <form onSubmit={handleSave} className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-6 shadow-2xl space-y-5">
        <h3 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider">
          Capital Preservation & Risk Limits
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#8B98AA] mb-1.5 uppercase">
              Maximum Stake per Trade ($)
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={settings.maxStake}
              onChange={(e) => setSettings({ ...settings, maxStake: Number(e.target.value) })}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
            <span className="text-[11px] text-[#8B98AA] mt-1 block">Prevents catastrophic over-leveraging on single entries.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B98AA] mb-1.5 uppercase">
              Daily Loss Threshold ($)
            </label>
            <input
              type="number"
              min={50}
              max={5000}
              value={settings.dailyLossLimit}
              onChange={(e) => setSettings({ ...settings, dailyLossLimit: Number(e.target.value) })}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
            <span className="text-[11px] text-[#8B98AA] mt-1 block">Trading automatically halts once this loss ceiling is reached.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B98AA] mb-1.5 uppercase">
              Maximum Concurrent Positions
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxOpenPositions}
              onChange={(e) => setSettings({ ...settings, maxOpenPositions: Number(e.target.value) })}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
            <span className="text-[11px] text-[#8B98AA] mt-1 block">Maximum allowed open binary & forex contracts.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B98AA] mb-1.5 uppercase">
              Default Payout Rate
            </label>
            <input
              type="number"
              step={0.01}
              min={0.5}
              max={0.95}
              value={settings.defaultPayoutRate}
              onChange={(e) => setSettings({ ...settings, defaultPayoutRate: Number(e.target.value) })}
              className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-sm font-mono-numbers font-bold text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
            />
            <span className="text-[11px] text-[#8B98AA] mt-1 block">Standard contract payout (e.g., 0.85 = 85%).</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#00F3FF] hover:bg-[#00FF88] text-[#04060A] font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00F3FF]/20"
          >
            {loading ? 'Saving...' : 'Save Risk Rules'}
          </button>
        </div>
      </form>

      {/* Account Management & Reset */}
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-6 shadow-2xl space-y-4">
        <h3 className="text-xs font-bold text-[#8B98AA] uppercase tracking-wider">
          Paper Trading Capital Management
        </h3>

        <div className="flex flex-wrap items-center justify-between p-4 bg-[#101722] rounded-xl border border-[#1E293B] gap-4">
          <div>
            <span className="text-[11px] text-[#8B98AA] uppercase font-bold block">Current Paper Balance</span>
            <span className="font-mono-numbers text-2xl font-black text-[#00FF88]">
              ${account?.balance.toFixed(2) ?? '10,000.00'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetBalance}
            className="px-4 py-2 bg-[#1E293B] hover:bg-[#FF4560] text-[#E8EDF5] hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Balance to $10,000</span>
          </button>
        </div>
      </div>

      {/* Real Broker Trading Lock Notification */}
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-xl p-5 shadow-2xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
          <Lock className="w-4 h-4 text-[#F59E0B]" />
          <span>Real Broker Order Execution Safety Lock</span>
        </div>
        <p className="text-xs text-[#8B98AA] leading-relaxed">
          In strict compliance with the architecture blueprint, real-money broker execution is disabled by default.
          The terminal operates in full institutional Paper Simulation mode to guarantee zero unverified execution risk.
        </p>
      </div>
    </div>
  );
};
