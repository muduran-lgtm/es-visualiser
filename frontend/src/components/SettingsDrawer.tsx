import React, { useState } from 'react';
import { X, Server, Plus, Trash2, ShieldCheck, ShieldAlert, Key, RefreshCw, Pencil } from 'lucide-react';
import { ClientConnectionSummary } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connections: ClientConnectionSummary[];
  activeConnectionId: string;
  onSelectConnection: (id: string) => Promise<void>;
  onSaveConnection: (conn: any) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
  onTestConnection: (connData?: any) => Promise<{ ok: boolean; message: string; version?: string }>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  connections,
  activeConnectionId,
  onSelectConnection,
  onSaveConnection,
  onDeleteConnection,
  onTestConnection
}) => {
  const { isDarkTheme } = useTheme();
  const [editingConn, setEditingConn] = useState<any | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleStartNew = () => {
    setEditingConn({
      name: '',
      url: 'https://192.168.31.31:5601',
      space: 'default',
      apiKey: '',
      insecureTLS: true
    });
    setTestResult(null);
  };

  const handleStartEdit = (conn: ClientConnectionSummary) => {
    setEditingConn({
      id: conn.id,
      name: conn.name,
      url: conn.url,
      space: conn.space || 'default',
      apiKey: '',
      apiKeyMasked: conn.apiKeyMasked,
      insecureTLS: conn.insecureTLS
    });
    setTestResult(null);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConn.name || !editingConn.url) return;
    await onSaveConnection(editingConn);
    setEditingConn(null);
  };

  const handleTest = async (connData: any) => {
    setTestingId(connData.id || 'new');
    setTestResult(null);
    try {
      const res = await onTestConnection(connData);
      setTestResult({
        id: connData.id || 'new',
        ok: res.ok,
        message: res.message
      });
    } catch (err: any) {
      setTestResult({
        id: connData.id || 'new',
        ok: false,
        message: err.message || 'Connection failed'
      });
    } finally {
      setTestingId(null);
    }
  };

  const inputClass = `w-full text-xs px-3 py-1.5 rounded border focus:outline-none focus:border-[#00bfb3] transition-colors ${
    isDarkTheme ? 'bg-[#14151a] text-white border-[#2d3139]' : 'bg-white text-slate-900 border-slate-300'
  }`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className={`w-full max-w-xl border-l h-full flex flex-col shadow-2xl animate-in slide-in-from-right transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#181920] border-[#2d3139] text-[#e1e2e6]' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDarkTheme ? 'bg-[#1f212a] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <Server size={20} className="text-[#00bfb3]" />
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                Cluster Inventory & Integrations
              </h2>
              <p className={`text-[11px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                Manage connected Kibana clusters and mock environments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkTheme ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Connection List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>
                Configured Environments
              </span>
              <button
                onClick={handleStartNew}
                className="px-2.5 py-1 bg-[#00bfb3] hover:bg-[#00a89d] text-black rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow"
              >
                <Plus size={13} />
                <span>Add Environment</span>
              </button>
            </div>

            <div className="space-y-2">
              {connections.map((c) => {
                const isActive = c.id === activeConnectionId;
                const isTesting = testingId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive
                        ? isDarkTheme 
                          ? 'bg-[#20232d] border-[#00bfb3] ring-1 ring-[#00bfb3]/30' 
                          : 'bg-teal-50/70 border-[#00bfb3] ring-1 ring-[#00bfb3]/30'
                        : isDarkTheme 
                          ? 'bg-[#1b1c23] border-[#2d3139] hover:border-neutral-500' 
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-xs truncate ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{c.name}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#00bfb3]/20 text-[#00bfb3] border border-[#00bfb3]/40">
                              Active
                            </span>
                          )}
                          {c.isMock && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-900/40 text-purple-300 border border-purple-700/40">
                              Mock Mode
                            </span>
                          )}
                        </div>

                        <div className={`text-[11px] font-mono mt-1 truncate ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {c.url} {c.space && c.space !== 'default' && `[Space: ${c.space}]`}
                        </div>

                        {c.apiKeyMasked && (
                          <div className={`text-[10px] flex items-center gap-1 mt-0.5 font-mono ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                            <Key size={10} /> {c.apiKeyMasked}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => onSelectConnection(c.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                              isDarkTheme ? 'bg-[#2a2d39] hover:bg-[#343847] text-neutral-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => handleTest(c)}
                          disabled={isTesting}
                          className={`p-1.5 rounded transition-colors ${
                            isDarkTheme ? 'text-neutral-400 hover:text-[#00bfb3] hover:bg-[#252834]' : 'text-slate-400 hover:text-[#00bfb3] hover:bg-slate-100'
                          }`}
                          title="Test Connection"
                        >
                          <RefreshCw size={14} className={isTesting ? 'animate-spin text-[#00bfb3]' : ''} />
                        </button>
                        {!c.isMock && (
                          <button
                            onClick={() => handleStartEdit(c)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkTheme ? 'text-neutral-400 hover:text-amber-300 hover:bg-[#252834]' : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                            }`}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {!c.isMock && (
                          <button
                            onClick={() => onDeleteConnection(c.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkTheme ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test result message */}
                    {testResult && testResult.id === c.id && (
                      <div className={`mt-2.5 p-2 rounded text-[11px] flex items-center gap-1.5 ${
                        testResult.ok ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                      }`}>
                        {testResult.ok ? <ShieldCheck size={14} className="shrink-0" /> : <ShieldAlert size={14} className="shrink-0" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* New / Edit Form */}
          {editingConn && (
            <form onSubmit={handleSaveForm} className={`p-4 rounded-xl border space-y-3 ${
              isDarkTheme ? 'bg-[#20232d] border-[#00bfb3]/40' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex items-center justify-between pb-2 border-b ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  {editingConn.id ? 'Edit Kibana Environment' : 'Add Kibana Environment'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingConn(null)}
                  className={`text-xs ${isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] font-semibold ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>Environment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Cluster"
                  value={editingConn.name}
                  onChange={(e) => setEditingConn({ ...editingConn, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] font-semibold ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>Kibana URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://192.168.31.31:5601"
                  value={editingConn.url}
                  onChange={(e) => setEditingConn({ ...editingConn, url: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>Space ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="default"
                    value={editingConn.space}
                    onChange={(e) => setEditingConn({ ...editingConn, space: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold flex items-center justify-between ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>
                    <span>Self-signed TLS (ECK)</span>
                  </label>
                  <label className={`flex items-center gap-2 mt-2 text-xs cursor-pointer ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={editingConn.insecureTLS}
                      onChange={(e) => setEditingConn({ ...editingConn, insecureTLS: e.target.checked })}
                      className="accent-[#00bfb3] rounded"
                    />
                    <span>Ignore Certificate (Insecure)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`text-[11px] font-semibold ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>Kibana API Key</label>
                  {editingConn.apiKeyMasked && (
                    <span className={`text-[10px] font-mono ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Current: {editingConn.apiKeyMasked}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder={editingConn.apiKeyMasked ? "Leave blank to keep current key" : "Base64-encoded Kibana API Key"}
                  value={editingConn.apiKey}
                  onChange={(e) => setEditingConn({ ...editingConn, apiKey: e.target.value })}
                  className={`${inputClass} font-mono`}
                />
                <p className={`text-[10px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {editingConn.id 
                    ? 'Leave blank if you do not wish to change the existing API key.' 
                    : 'API Key is never stored in the browser; it is proxied securely via backend.'}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(editingConn)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    isDarkTheme ? 'text-neutral-300 bg-[#2b2e3c] hover:bg-[#34384a]' : 'text-slate-700 bg-slate-200 hover:bg-slate-300'
                  }`}
                >
                  Test Connection
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-[#00bfb3] hover:bg-[#00a89d] text-black transition-colors shadow"
                >
                  {editingConn.id ? 'Update' : 'Save'}
                </button>
              </div>

              {testResult && (testResult.id === 'new' || testResult.id === editingConn.id) && (
                <div className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                  testResult.ok ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                }`}>
                  {testResult.ok ? <ShieldCheck size={14} className="shrink-0" /> : <ShieldAlert size={14} className="shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
