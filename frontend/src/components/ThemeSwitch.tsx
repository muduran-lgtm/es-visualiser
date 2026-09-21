import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeSwitchProps {
  showLabel?: boolean;
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ showLabel = false, className = '' }) => {
  const { isDarkTheme, toggleTheme } = useTheme();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        toggleTheme();
      }}
      role="switch"
      aria-checked={isDarkTheme}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          toggleTheme();
        }
      }}
      className={`inline-flex items-center gap-2 cursor-pointer select-none group ${className}`}
      title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {showLabel && (
        <span className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
          isDarkTheme ? 'text-neutral-300 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-950'
        }`}>
          {isDarkTheme ? (
            <>
              <Moon size={13} className="text-[#00bfb3]" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun size={13} className="text-amber-500" />
              <span>Light Mode</span>
            </>
          )}
        </span>
      )}

      {/* Pill Track */}
      <div
        className={`relative inline-flex items-center h-6 w-12 shrink-0 rounded-full px-0.5 transition-all duration-300 ease-in-out border ${
          isDarkTheme
            ? 'bg-[#181a20] border-[#373c49] group-hover:border-[#00bfb3]/60 shadow-inner'
            : 'bg-amber-100 border-amber-300 group-hover:border-amber-400 shadow-inner'
        }`}
      >
        {/* Track Icons Behind Knob */}
        <div className="absolute inset-0 flex justify-between items-center px-1.5 pointer-events-none">
          <Sun size={11} className={`transition-opacity duration-300 ${isDarkTheme ? 'opacity-30 text-neutral-500' : 'opacity-100 text-amber-600'}`} />
          <Moon size={11} className={`transition-opacity duration-300 ${isDarkTheme ? 'opacity-100 text-[#00bfb3]' : 'opacity-30 text-neutral-400'}`} />
        </div>

        {/* Sliding Knob (Moves Left for Light, Right for Dark) */}
        <div
          className={`w-5 h-5 rounded-full shadow-md flex items-center justify-center transform transition-transform duration-300 ease-out z-10 ${
            isDarkTheme
              ? 'translate-x-6 bg-[#00bfb3] text-[#0f1015]'
              : 'translate-x-0 bg-white text-amber-500 ring-1 ring-amber-200'
          }`}
        >
          {isDarkTheme ? (
            <Moon size={10} className="stroke-[2.5]" />
          ) : (
            <Sun size={10} className="stroke-[2.5]" />
          )}
        </div>
      </div>
    </div>
  );
};
