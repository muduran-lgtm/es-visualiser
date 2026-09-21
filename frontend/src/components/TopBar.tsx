import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, Save, RotateCcw, LayoutTemplate, 
  GitCommit, Download, Plus,
  ChevronDown, Sun, Moon, Key, LogOut, Shield, AlertTriangle
} from 'lucide-react';
import { WorkflowSummary, ClientConnectionSummary, UserProfile } from '../types.js';
import { ThemeSwitch } from './ThemeSwitch.js';
import { useTheme } from '../context/ThemeContext.js';

interface TopBarProps {
  workflows: WorkflowSummary[];
  currentWorkflowId: string;
  workflowName: string;
  workflowEnabled: boolean;
  isDirty: boolean;
  isSaving: boolean;
  validationErrorsCount?: number;
  activeConnection: ClientConnectionSummary | null;
  currentUser: UserProfile | null;
  onOpenUserSettings: () => void;
  onOpenConnections: () => void;
  onSelectWorkflow: (id: string) => void;
  onNameChange: (name: string) => void;
  onToggleEnabled: () => void;
  onAutoLayout: () => void;
  onOpenDiff: () => void;
  onSave: () => void;
  onReload: () => void;
  onNewWorkflow: (templateKey: 'blank' | 'simple' | 'search' | 'flow') => void;
  onDownloadYaml: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  workflows,
  currentWorkflowId,
  workflowName,
  workflowEnabled,
  isDirty,
  isSaving,
  validationErrorsCount = 0,
  activeConnection,
  currentUser,
  onOpenUserSettings,
  onOpenConnections,
  onSelectWorkflow,
  onNameChange,
  onToggleEnabled,
  onAutoLayout,
  onOpenDiff,
  onSave,
  onReload,
  onNewWorkflow,
  onDownloadYaml,
  onLogout,
  onChangePassword
}) => {
  const { isDarkTheme } = useTheme();
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header
      className={`h-12 border-b px-3 flex items-center justify-between select-none shrink-0 z-10 transition-colors duration-200 ${
        isDarkTheme 
          ? 'bg-[#1b1c23] border-[#2d3139] text-[#e1e2e6]' 
          : 'bg-white border-slate-200 text-slate-800 shadow-xs'
      }`}
    >
      {/* Left section: Hamburger (User Settings), Brand, Connection Pill, Workflow Selector */}
      <div className="flex items-center gap-2.5">
        {/* Hamburger Menu -> Opens Left Settings Drawer */}
        <button
          onClick={onOpenUserSettings}
          className={`p-1.5 rounded-md transition-colors ${
            isDarkTheme
              ? 'text-neutral-300 hover:text-white hover:bg-[#252834]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Settings & Administration (Hamburger Menu)"
        >
          <Menu size={18} />
        </button>

        {/* Brand: Panoptext.Visualiser */}
        <div className="flex items-center gap-1.5 pr-1">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00bfb3] to-[#0077cc] flex items-center justify-center font-black text-black text-[10px] shadow">
            P
          </div>
          <div className="flex items-center text-xs tracking-tight">
            <span className={`font-extrabold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Panoptext</span>
            <span className="font-bold text-[#00bfb3]">.Visualiser</span>
          </div>
        </div>

        <div className={`h-4 w-[1px] ${isDarkTheme ? 'bg-[#2d3139]' : 'bg-slate-300'}`} />

        {/* Active connection / Inventory pill -> Opens Cluster Integrations */}
        <button
          onClick={onOpenConnections}
          className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-medium transition-colors shadow-xs border ${
            isDarkTheme
              ? 'bg-[#20222b] hover:bg-[#272a37] border-[#2d3139] hover:border-[#4b5362] text-neutral-300'
              : 'bg-slate-100 hover:bg-slate-200/80 border-slate-300 hover:border-slate-400 text-slate-700'
          }`}
          title="Cluster Inventory & Integrations (Click to switch or edit clusters)"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${activeConnection?.isMock ? 'bg-purple-400' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`} />
          <span className="truncate max-w-[140px]">{activeConnection?.name || 'Mock Environment'}</span>
          <ChevronDown size={11} className={isDarkTheme ? 'text-neutral-500' : 'text-slate-400'} />
        </button>

        <div className={`h-4 w-[1px] ${isDarkTheme ? 'bg-[#2d3139]' : 'bg-slate-300'}`} />

        {/* Workflow Dropdown */}
        <div className="flex items-center gap-1.5">
          <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
            Workflow:
          </label>
          <select
            value={currentWorkflowId}
            onChange={(e) => onSelectWorkflow(e.target.value)}
            className={`text-xs px-2.5 py-1 rounded border focus:outline-none focus:border-[#00bfb3] max-w-[190px] truncate transition-colors ${
              isDarkTheme
                ? 'bg-[#121316] text-white border-[#2d3139]'
                : 'bg-slate-50 text-slate-900 border-slate-300'
            }`}
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
        </div>

        {/* New Workflow Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${
              isDarkTheme
                ? 'bg-[#20222b] hover:bg-[#272a37] text-neutral-300 border-[#2d3139]'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            <Plus size={13} />
            <span>New</span>
            <ChevronDown size={11} />
          </button>

          {templateMenuOpen && (
            <div className={`absolute left-0 mt-1 w-56 rounded-lg shadow-2xl py-1 z-50 text-xs border ${
              isDarkTheme
                ? 'bg-[#181920] border-[#2d3139] text-neutral-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <button
                onClick={() => { onNewWorkflow('blank'); setTemplateMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 transition-colors ${isDarkTheme ? 'hover:bg-[#252834]' : 'hover:bg-slate-100'}`}
              >
                Blank Workflow
              </button>
              <button
                onClick={() => { onNewWorkflow('simple'); setTemplateMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 transition-colors ${isDarkTheme ? 'hover:bg-[#252834]' : 'hover:bg-slate-100'}`}
              >
                Manual Trigger + Console Log
              </button>
              <button
                onClick={() => { onNewWorkflow('search'); setTemplateMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 transition-colors ${isDarkTheme ? 'hover:bg-[#252834]' : 'hover:bg-slate-100'}`}
              >
                Elasticsearch Search + Alert
              </button>
              <button
                onClick={() => { onNewWorkflow('flow'); setTemplateMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 transition-colors ${isDarkTheme ? 'hover:bg-[#252834]' : 'hover:bg-slate-100'}`}
              >
                Conditional Flow & Loop (if/foreach)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Workflow Name Input + Enabled Switch */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={workflowName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Workflow Name..."
          className={`text-xs font-bold px-2 py-1 rounded border transition-colors text-center min-w-[200px] focus:outline-none focus:border-[#00bfb3] ${
            isDarkTheme
              ? 'bg-transparent hover:bg-[#121316] focus:bg-[#121316] text-white border-transparent hover:border-[#2d3139]'
              : 'bg-transparent hover:bg-slate-100 focus:bg-slate-100 text-slate-900 border-transparent hover:border-slate-300'
          }`}
        />

        {/* Enabled Toggle Switch */}
        <button
          onClick={onToggleEnabled}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors border ${
            workflowEnabled
              ? isDarkTheme 
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
              : isDarkTheme
                ? 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
          }`}
          title={workflowEnabled ? 'Workflow is enabled' : 'Workflow is disabled'}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${workflowEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
          <span>{workflowEnabled ? 'Enabled' : 'Disabled'}</span>
        </button>

        {/* Dirty State Indicator */}
        {isDirty && (
          <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
            isDarkTheme
              ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
              : 'text-amber-700 bg-amber-50 border-amber-300'
          }`}>
            ● Unsaved changes
          </span>
        )}
      </div>

      {/* Right section: Action buttons + Sliding Theme Switch + User Avatar */}
      <div className="flex items-center gap-1.5">
        {/* Auto Layout button */}
        <button
          onClick={onAutoLayout}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors border ${
            isDarkTheme
              ? 'text-neutral-300 bg-[#20222b] hover:bg-[#272a37] border-[#2d3139]'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
          }`}
          title="Auto Layout (Shortcut: Ctrl+D)"
        >
          <LayoutTemplate size={13} />
          <span>Auto Layout</span>
        </button>

        {/* Diff Preview button */}
        <button
          onClick={onOpenDiff}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors border ${
            isDarkTheme
              ? 'text-neutral-300 bg-[#20222b] hover:bg-[#272a37] border-[#2d3139]'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
          }`}
          title="View Changes (Diff Preview)"
        >
          <GitCommit size={13} />
          <span>View Diff</span>
        </button>

        {/* Download YAML */}
        <button
          onClick={onDownloadYaml}
          className={`p-1.5 rounded transition-colors ${
            isDarkTheme
              ? 'text-neutral-400 hover:text-white hover:bg-[#252834]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Download YAML File (.yaml)"
        >
          <Download size={14} />
        </button>

        {/* Reload button */}
        <button
          onClick={onReload}
          className={`p-1.5 rounded transition-colors ${
            isDarkTheme
              ? 'text-neutral-400 hover:text-white hover:bg-[#252834]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Reload (Discard changes)"
        >
          <RotateCcw size={14} />
        </button>

        {/* Schema Validation Issues Badge */}
        {validationErrorsCount > 0 && (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0 select-none animate-pulse"
            title={`${validationErrorsCount} adet şema / doğrulama sorunu var. Ayrıntılar için alt kısımdaki YAML editörüne bakın.`}
          >
            <AlertTriangle size={13} className="shrink-0 text-rose-400" />
            <span>{validationErrorsCount} Hata</span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded bg-[#00bfb3] hover:bg-[#00a89d] text-[#121316] transition-colors shadow disabled:opacity-50"
          title="Save to Kibana (Shortcut: Ctrl+S)"
        >
          <Save size={13} />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        {/* Divider */}
        <div className={`h-4 w-[1px] ${isDarkTheme ? 'bg-[#2d3139]' : 'bg-slate-300'} mx-1`} />

        {/* User Avatar Circle (Sağ Üst Yuvarlak) */}
        {currentUser && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ring-1 ring-white/20 hover:ring-white/50 transition-all hover:scale-105"
              style={{ backgroundColor: currentUser.avatarColor || '#00bfb3' }}
              title={`Logged in as ${currentUser.fullName} (@${currentUser.username})`}
            >
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase()}
            </button>

            {/* Popover Dropdown (Theme Switch, Password, Logout) */}
            {userMenuOpen && (
              <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-2xl p-2 z-50 text-xs animate-fadeIn border ${
                isDarkTheme
                  ? 'bg-[#181920] border-[#2d3139] text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* User Details */}
                <div className={`px-2.5 py-2 border-b mb-1 ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
                  <div className={`font-bold text-xs truncate ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{currentUser.fullName}</div>
                  <div className={`text-[11px] font-mono mt-0.5 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>@{currentUser.username}</div>
                  <div className="mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border ${
                      isDarkTheme
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}>
                      <Shield size={10} /> {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Dark / Light Theme Sliding Switch Row */}
                <div className={`px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  isDarkTheme ? 'hover:bg-[#252834]' : 'hover:bg-slate-100'
                }`}>
                  <div className="flex items-center gap-2">
                    {isDarkTheme ? <Moon size={14} className="text-[#00bfb3]" /> : <Sun size={14} className="text-amber-500" />}
                    <span className={`font-medium ${isDarkTheme ? 'text-neutral-200' : 'text-slate-700'}`}>
                      {isDarkTheme ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                  <ThemeSwitch showLabel={false} />
                </div>

                {/* Change Password */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onChangePassword();
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                    isDarkTheme
                      ? 'hover:bg-[#252834] text-neutral-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Key size={14} className="text-amber-500" />
                  <span>Change Password</span>
                </button>

                <div className={`h-[1px] my-1 ${isDarkTheme ? 'bg-[#2d3139]' : 'bg-slate-200'}`} />

                {/* Log Out */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors font-medium ${
                    isDarkTheme
                      ? 'hover:bg-rose-950/40 text-rose-300'
                      : 'hover:bg-rose-50 text-rose-600'
                  }`}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
