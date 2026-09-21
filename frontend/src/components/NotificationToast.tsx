import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Copy, Check, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface NotificationToastProps {
  notification: { type: 'success' | 'error'; message: string } | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose
}) => {
  const { isDarkTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const duration = notification?.type === 'error' ? 8000 : 4500;
  const intervalMs = 50;
  const step = (intervalMs / duration) * 100;

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    setCopied(false);
    setIsPaused(false);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (isPaused) return prev;
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          onClose();
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [notification, isPaused, step, onClose]);

  if (!notification) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(notification.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = notification.type === 'success';

  return (
    <div
      className="fixed top-14 right-5 z-50 max-w-lg w-full sm:w-[480px] animate-fadeIn select-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={`rounded-xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
          isSuccess
            ? isDarkTheme
              ? 'bg-[#0f231c]/95 border-emerald-700/80 text-emerald-200'
              : 'bg-emerald-50/95 border-emerald-400 text-emerald-950 shadow-emerald-900/10'
            : isDarkTheme
              ? 'bg-[#251017]/95 border-rose-700/80 text-rose-200'
              : 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-900/10'
        }`}
      >
        <div className="p-3.5 flex items-start gap-3">
          {/* Status Icon */}
          <div className="shrink-0 mt-0.5">
            {isSuccess ? (
              <CheckCircle2 size={18} className={isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'} />
            ) : (
              <AlertCircle size={18} className={isDarkTheme ? 'text-rose-400' : 'text-rose-600'} />
            )}
          </div>

          {/* Selectable Message Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isSuccess
                  ? isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'
                  : isDarkTheme ? 'text-rose-400' : 'text-rose-700'
              }`}>
                {isSuccess ? 'Success' : 'Error Notification'}
              </span>

              {isPaused && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isDarkTheme ? 'bg-white/10 text-neutral-400' : 'bg-black/5 text-slate-500'
                }`}>
                  Paused (Hovering)
                </span>
              )}
            </div>

            {/* The actual selectable text */}
            <div
              className={`text-xs font-mono select-text cursor-text break-words max-h-44 overflow-y-auto pr-1 leading-relaxed ${
                isDarkTheme ? 'text-neutral-200 selection:bg-teal-700 selection:text-white' : 'text-slate-900 selection:bg-teal-200 selection:text-black'
              }`}
              title="Click or drag to select text"
            >
              {notification.message}
            </div>
          </div>

          {/* Actions: Copy and Close */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                copied
                  ? 'bg-emerald-500 text-black font-semibold'
                  : isDarkTheme
                    ? 'bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white'
                    : 'bg-black/5 hover:bg-black/10 text-slate-700 hover:text-slate-950'
              }`}
              title="Copy message to clipboard"
            >
              {copied ? <Check size={12} className="shrink-0" /> : <Copy size={12} className="shrink-0" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`p-1 rounded transition-colors ${
                isDarkTheme
                  ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
              }`}
              title="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar Timer */}
        <div className={`h-1 w-full ${isDarkTheme ? 'bg-black/40' : 'bg-black/10'}`}>
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isSuccess
                ? isDarkTheme ? 'bg-emerald-500' : 'bg-emerald-600'
                : isDarkTheme ? 'bg-rose-500' : 'bg-rose-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
