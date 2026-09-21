import React, { useState } from 'react';
import { X, Lock, AlertCircle, Check } from 'lucide-react';
import { changePasswordApi } from '../services/auth.js';
import { useTheme } from '../context/ThemeContext.js';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  username
}) => {
  const { isDarkTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 3) {
      setError('New password must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:border-[#00bfb3] transition-colors ${
    isDarkTheme 
      ? 'bg-[#121316] text-white border-[#2d3139]' 
      : 'bg-slate-50 text-slate-900 border-slate-300'
  }`;

  const labelClass = `text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
    isDarkTheme ? 'text-neutral-300' : 'text-slate-700'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4 select-none">
      <div className={`w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-fadeIn border transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#181920] border-[#2d3139] text-[#e1e2e6]' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkTheme ? 'border-[#2d3139] bg-[#1f212a]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#00bfb3]" />
            <span className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Change Password</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isDarkTheme ? 'text-neutral-400 hover:text-white hover:bg-[#252834]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className={`text-xs ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
            Updating password for user <span className={`font-semibold font-mono ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>@{username}</span>
          </p>

          {error && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800/80 text-rose-300 rounded text-xs flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded text-xs flex items-center gap-1.5">
              <Check size={14} className="shrink-0" />
              <span>Password changed successfully!</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-xs rounded ${
                isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-1.5 bg-[#00bfb3] hover:bg-[#00a89d] text-black font-bold text-xs rounded transition-colors shadow disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
