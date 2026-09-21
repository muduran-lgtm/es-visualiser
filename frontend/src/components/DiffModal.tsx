import React from 'react';
import { diffLines } from 'diff';
import { X, GitCommit, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalYaml: string;
  currentYaml: string;
  onConfirmSave?: () => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  originalYaml,
  currentYaml,
  onConfirmSave
}) => {
  const { isDarkTheme } = useTheme();
  if (!isOpen) return null;

  const diff = diffLines(originalYaml || '', currentYaml || '');
  const hasChanges = diff.some(part => part.added || part.removed);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className={`border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#181920] border-[#2d3139] text-[#e1e2e6]' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDarkTheme ? 'bg-[#1f212a] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <GitCommit size={18} className="text-[#00bfb3]" />
            <span className={`font-semibold text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Preview Changes (Diff)</span>
            <span className={`text-xs ml-2 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
              (Original from Kibana vs. Current edits)
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isDarkTheme ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Diff Content */}
        <div className={`flex-1 overflow-auto p-4 font-mono text-xs ${
          isDarkTheme ? 'bg-[#121316]' : 'bg-slate-50'
        }`}>
          {!hasChanges ? (
            <div className={`text-center py-16 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
              No unsaved changes found.
            </div>
          ) : (
            <div className="space-y-0.5">
              {diff.map((part, index) => {
                let bgClass = isDarkTheme ? 'text-neutral-300' : 'text-slate-700';
                let prefix = ' ';
                if (part.added) {
                  bgClass = isDarkTheme 
                    ? 'bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500 pl-1'
                    : 'bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500 pl-1';
                  prefix = '+';
                } else if (part.removed) {
                  bgClass = isDarkTheme
                    ? 'bg-rose-950/60 text-rose-300 border-l-2 border-rose-500 pl-1'
                    : 'bg-rose-50 text-rose-800 border-l-2 border-rose-500 pl-1';
                  prefix = '-';
                }

                return (
                  <div key={index} className={`whitespace-pre-wrap py-0.5 font-mono ${bgClass}`}>
                    {part.value.split('\n').map((line, lIdx) => {
                      if (line === '' && lIdx === part.value.split('\n').length - 1) return null;
                      return (
                        <div key={lIdx} className="leading-5">
                          <span className="opacity-50 select-none mr-2">{prefix}</span>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${
          isDarkTheme ? 'bg-[#1a1c24] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className={`text-xs ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
            Green (+) indicates additions, red (-) indicates deletions.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                isDarkTheme ? 'text-neutral-300 hover:bg-[#252834]' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
            {onConfirmSave && (
              <button
                onClick={() => {
                  onConfirmSave();
                  onClose();
                }}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-[#00bfb3] hover:bg-[#00a89d] text-black transition-colors flex items-center gap-1.5 shadow"
              >
                <span>Validate & Save</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
