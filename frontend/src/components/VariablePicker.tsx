import React, { useState, useRef, useEffect } from 'react';
import { Variable, Search, X, Layers, Activity, Repeat, CornerDownLeft } from 'lucide-react';
import { VariableItem } from '../services/graphTraverse.js';
import { useTheme } from '../context/ThemeContext.js';

interface VariablePickerProps {
  variables: VariableItem[];
  onSelect: (expression: string) => void;
  title?: string;
  buttonLabel?: string;
  className?: string;
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  variables,
  onSelect,
  title = 'Insert Variable',
  buttonLabel,
  className = ''
}) => {
  const { isDarkTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'step' | 'trigger' | 'loop'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredVars = variables.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.expression.toLowerCase().includes(q) ||
      (item.sourceName && item.sourceName.toLowerCase().includes(q)) ||
      (item.sourceType && item.sourceType.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const categories = [
    { id: 'all', label: 'All', count: variables.length },
    { id: 'step', label: 'Steps', count: variables.filter(v => v.category === 'step').length },
    { id: 'trigger', label: 'Triggers', count: variables.filter(v => v.category === 'trigger').length },
    { id: 'loop', label: 'Loop', count: variables.filter(v => v.category === 'loop').length },
  ].filter(c => c.count > 0 || c.id === 'all');

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer ${
          isDarkTheme
            ? 'bg-[#1b1e28] hover:bg-[#262a39] text-[#00bfb3] border-[#2e3444]'
            : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
        }`}
        title={title}
      >
        <Variable size={11} className="shrink-0 text-[#00bfb3]" />
        <span>{buttonLabel || '{x}'}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-80 max-h-96 z-50 rounded-lg shadow-2xl border flex flex-col backdrop-blur-md overflow-hidden animate-in fade-in duration-150 ${
            isDarkTheme
              ? 'bg-[#181a22]/95 border-[#2f3547] text-neutral-200'
              : 'bg-white/98 border-slate-300 text-slate-800 shadow-slate-400/20'
          }`}
        >
          {/* Header */}
          <div className={`p-2.5 border-b flex items-center justify-between ${
            isDarkTheme ? 'border-[#282d3d] bg-[#14161c]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Variable size={13} className="text-[#00bfb3]" />
              <span>Available Upstream Variables</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-neutral-700/30 text-neutral-400 hover:text-neutral-200"
            >
              <X size={12} />
            </button>
          </div>

          {/* Search Box */}
          <div className={`p-2 border-b flex items-center gap-2 ${
            isDarkTheme ? 'border-[#282d3d] bg-[#121318]' : 'border-slate-200 bg-slate-100/60'
          }`}>
            <Search size={12} className="text-neutral-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variables (e.g. hits, status, body)..."
              className={`w-full text-[11px] bg-transparent focus:outline-none placeholder-neutral-500 font-mono ${
                isDarkTheme ? 'text-white' : 'text-slate-900'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-neutral-400 hover:text-neutral-200 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className={`flex items-center gap-1 px-2 py-1.5 border-b text-[10px] ${
            isDarkTheme ? 'border-[#282d3d] bg-[#161820]' : 'border-slate-200 bg-slate-50'
          }`}>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#00bfb3] text-[#111317] font-semibold'
                    : isDarkTheme
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Variables List */}
          <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-neutral-800/30">
            {filteredVars.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                No matching variables found.
              </div>
            ) : (
              filteredVars.map((v, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onSelect(v.expression);
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded cursor-pointer transition-colors group text-left ${
                    isDarkTheme
                      ? 'hover:bg-[#232736]'
                      : 'hover:bg-teal-50'
                  }`}
                  title="Click to insert variable"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="font-mono text-[11px] font-semibold text-[#00bfb3] truncate">
                      {v.expression}
                    </div>
                    <CornerDownLeft size={11} className="text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    {v.category === 'step' && (
                      <span className="flex items-center gap-1 text-sky-400 bg-sky-950/40 px-1 py-0.2 rounded border border-sky-800/30">
                        <Layers size={9} />
                        <span>{v.sourceName}</span>
                      </span>
                    )}
                    {v.category === 'trigger' && (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-1 py-0.2 rounded border border-amber-800/30">
                        <Activity size={9} />
                        <span>Trigger</span>
                      </span>
                    )}
                    {v.category === 'loop' && (
                      <span className="flex items-center gap-1 text-purple-400 bg-purple-950/40 px-1 py-0.2 rounded border border-purple-800/30">
                        <Repeat size={9} />
                        <span>Loop</span>
                      </span>
                    )}

                    {v.dataType && (
                      <span className="font-mono text-neutral-400 text-[9px] uppercase">
                        [{v.dataType}]
                      </span>
                    )}
                  </div>

                  {v.description && (
                    <div className={`text-[10px] mt-1 leading-snug line-clamp-2 ${
                      isDarkTheme ? 'text-neutral-400' : 'text-slate-500'
                    }`}>
                      {v.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
