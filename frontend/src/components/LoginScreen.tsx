import React, { useState } from 'react';
import { User, Key, AlertCircle, Shield, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1015] flex items-center justify-center p-4 select-none">
      {/* Background ambient glow */}
      <div className="absolute w-[500px] h-[500px] bg-[#00bfb3]/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[400px] h-[400px] bg-[#0077cc]/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md bg-[#181920] border border-[#2d3139] rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fadeIn">
        {/* Card Header */}
        <div className="p-8 pb-6 text-center border-b border-[#2d3139]/70 bg-[#1e2029]/70">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00bfb3] to-[#0077cc] mx-auto flex items-center justify-center font-black text-black text-2xl shadow-lg mb-3">
            P
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xl font-extrabold text-white tracking-wide">Panoptext</span>
            <span className="text-xl font-bold text-[#00bfb3]">.Visualiser</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Enterprise Elastic Workflows Orchestrator
          </p>
        </div>

        {/* Card Form */}
        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
                Username
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full bg-[#121316] text-sm text-white pl-10 pr-3 py-2.5 rounded-lg border border-[#2d3139] focus:outline-none focus:border-[#00bfb3] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
                Password
              </label>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#121316] text-sm text-white pl-10 pr-3 py-2.5 rounded-lg border border-[#2d3139] focus:outline-none focus:border-[#00bfb3] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00bfb3] hover:bg-[#00a89d] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card Footer */}
        <div className="p-3 bg-[#13141a] border-t border-[#2d3139] text-[10px] text-neutral-500 text-center flex items-center justify-center gap-1.5">
          <Shield size={11} className="text-emerald-400" />
          <span>Secured with HTTPS & Self-Signed TLS Encryption</span>
        </div>
      </div>
    </div>
  );
};
