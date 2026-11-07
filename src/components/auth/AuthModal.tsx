import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, Key, Mail, Lock, LogIn, UserPlus, LogOut, CheckCircle2, AlertCircle, X, Globe } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isRegisterMode) {
        await registerWithEmail(email, password, displayName);
        setSuccess('Account created and cloud database provisioned successfully!');
      } else {
        await loginWithEmail(email, password);
        setSuccess('Logged in successfully!');
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      setSuccess('Logged in with Google successfully!');
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setError(err?.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04060A]/80 backdrop-blur-md">
      <div className="bg-[#0B1018] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left relative overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00F3FF] via-[#00FF88] to-[#00F3FF]" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00F3FF]/10 border border-[#00F3FF]/30 flex items-center justify-center text-[#00F3FF]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#E8EDF5]">
                {user ? 'Cloud Account Profile' : isRegisterMode ? 'Register Account' : 'Sign In to Obsidian'}
              </h3>
              <p className="text-[11px] text-[#8B98AA]">
                {user ? 'Manage your cloud storage & credentials' : 'Per-user encrypted API key vault & preferences'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#8B98AA] hover:text-[#E8EDF5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logged In View */}
        {user ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#101722] rounded-xl border border-[#1E293B] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8B98AA] uppercase">Status</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30">
                  AUTHENTICATED
                </span>
              </div>
              <div className="text-sm font-bold text-[#E8EDF5] truncate">{user.email}</div>
              {user.displayName && <div className="text-xs text-[#8B98AA]">{user.displayName}</div>}
              <div className="text-[10px] text-[#8B98AA] font-mono-numbers pt-1">UID: {user.uid}</div>
            </div>

            <div className="p-3 bg-[#00F3FF]/10 border border-[#00F3FF]/30 rounded-xl text-xs text-[#00F3FF] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Your private API keys, signals, and risk settings are saved in Firestore Cloud.</span>
            </div>

            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full py-2.5 bg-[#FF4560]/10 hover:bg-[#FF4560] text-[#FF4560] hover:text-[#04060A] border border-[#FF4560]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Authentication Form */
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-[#FF4560]/10 border border-[#FF4560]/30 rounded-xl text-xs text-[#FF4560] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl text-xs text-[#00FF88] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#00F3FF]/40 text-[#E8EDF5] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-sm"
            >
              <Globe className="w-4 h-4 text-[#00F3FF]" />
              <span>Sign In with Google Account</span>
            </button>

            <div className="flex items-center gap-3 text-[10px] text-[#8B98AA] uppercase font-bold">
              <div className="flex-1 h-px bg-[#1E293B]" />
              <span>or email login</span>
              <div className="flex-1 h-px bg-[#1E293B]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegisterMode && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#8B98AA] uppercase mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Trader Name..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#101722] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#8B98AA] uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#8B98AA] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#101722] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8B98AA] uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#8B98AA] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#101722] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E8EDF5] focus:outline-none focus:border-[#00F3FF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#00F3FF] hover:bg-[#00FF88] text-[#04060A] rounded-xl text-xs font-black transition-all shadow-lg shadow-[#00F3FF]/20 flex items-center justify-center gap-2"
              >
                {isRegisterMode ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{loading ? 'Processing...' : isRegisterMode ? 'Create Cloud Account' : 'Sign In'}</span>
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-xs text-[#00F3FF] hover:underline font-bold"
              >
                {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Register free"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
