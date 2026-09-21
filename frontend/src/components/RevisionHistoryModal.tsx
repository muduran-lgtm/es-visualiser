import React, { useState, useEffect } from 'react';
import { diffLines } from 'diff';
import { 
  History, RotateCcw, X, Clock, User, Shield, 
  Copy, Check, RefreshCw, AlertCircle, FileText, GitCommit, CheckCircle2
} from 'lucide-react';
import { WorkflowRevision, WorkflowSummary } from '../types.js';
import { fetchWorkflowRevisions, rollbackWorkflowApi } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';

interface RevisionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
  currentYaml: string;
  onRollbackSuccess: (restoredWorkflow: WorkflowSummary, revision: WorkflowRevision) => void;
}

export const RevisionHistoryModal: React.FC<RevisionHistoryModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  workflowName,
  currentYaml,
  onRollbackSuccess
}) => {
  const { isDarkTheme } = useTheme();

  const [revisions, setRevisions] = useState<WorkflowRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'yaml'>('diff');
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load revisions on open
  const loadRevisions = async () => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchWorkflowRevisions(workflowId);
      setRevisions(list);
      if (list.length > 0) {
        // Select newest by default if none selected or previous selection no longer exists
        if (!selectedRevisionId || !list.some(r => r.revisionId === selectedRevisionId)) {
          setSelectedRevisionId(list[0].revisionId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load revisions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workflowId) {
      loadRevisions();
    }
  }, [isOpen, workflowId]);

  if (!isOpen) return null;

  const selectedRevision = revisions.find(r => r.revisionId === selectedRevisionId) || revisions[0] || null;
  const isLatestRevision = selectedRevision && revisions.length > 0 && selectedRevision.revisionId === revisions[0].revisionId;
  const isIdenticalToCurrent = selectedRevision && selectedRevision.yaml.trim() === currentYaml.trim();

  // Handle Rollback
  const handleRollback = async () => {
    if (!selectedRevision || !workflowId) return;

    const confirmPrompt = window.confirm(
      `Rollback workflow "${workflowName}" to Revision #${selectedRevision.revisionNumber}?\n\n` +
      `Authored by: ${selectedRevision.author.fullName} (@${selectedRevision.author.username})\n` +
      `Date: ${new Date(selectedRevision.timestamp).toLocaleString()}\n\n` +
      `The current canvas and server configuration will be restored to this exact revision.`
    );

    if (!confirmPrompt) return;

    setIsRollingBack(true);
    setError(null);
    try {
      const result = await rollbackWorkflowApi(workflowId, selectedRevision.revisionId);
      onRollbackSuccess(result.workflow, result.revision);
      await loadRevisions();
    } catch (err: any) {
      setError(err.message || 'Failed to rollback workflow.');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Copy YAML to clipboard
  const handleCopyYaml = () => {
    if (!selectedRevision) return;
    navigator.clipboard.writeText(selectedRevision.yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format relative timestamp
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 10) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  // Compute diff against current canvas YAML
  const diffParts = selectedRevision ? diffLines(currentYaml || '', selectedRevision.yaml || '') : [];
  const hasDiffChanges = diffParts.some(p => p.added || p.removed);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className={`border rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#16171d] border-[#2d3139] text-[#e1e2e6]' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
          isDarkTheme ? 'bg-[#1b1c23] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00bfb3]/10 border border-[#00bfb3]/30 flex items-center justify-center text-[#00bfb3]">
              <History size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  Workflow Version History & Rollback
                </h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                  isDarkTheme ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}>
                  Max 10 Revisions
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                {workflowName} • Inspect past edits, track author changes, or restore any previous revision
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRevisions}
              disabled={loading}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDarkTheme 
                  ? 'border-[#2d3139] hover:bg-[#252834] text-neutral-300' 
                  : 'border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
              title="Refresh Revision History"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-[#00bfb3]' : ''} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDarkTheme 
                  ? 'border-[#2d3139] hover:bg-[#252834] text-neutral-400 hover:text-white' 
                  : 'border-slate-300 hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 mb-0 p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Body: Left Revisions List + Right Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Revisions Timeline List */}
          <div className={`w-80 sm:w-88 border-r flex flex-col shrink-0 ${
            isDarkTheme ? 'bg-[#14151b] border-[#2d3139]' : 'bg-slate-100/60 border-slate-200'
          }`}>
            <div className={`px-4 py-2.5 border-b text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
              isDarkTheme ? 'border-[#2d3139] text-neutral-400' : 'border-slate-200 text-slate-500'
            }`}>
              <span>Change Timeline</span>
              <span>{revisions.length} of 10</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && revisions.length === 0 ? (
                <div className={`py-12 text-center text-xs flex items-center justify-center gap-2 ${
                  isDarkTheme ? 'text-neutral-400' : 'text-slate-500'
                }`}>
                  <RefreshCw size={14} className="animate-spin text-[#00bfb3]" />
                  <span>Loading revision history...</span>
                </div>
              ) : revisions.length === 0 ? (
                <div className={`py-12 text-center text-xs ${isDarkTheme ? 'text-neutral-500' : 'text-slate-400'}`}>
                  No revisions found. Save changes to start version history.
                </div>
              ) : (
                revisions.map((rev, index) => {
                  const isSelected = rev.revisionId === selectedRevisionId;
                  const isLatest = index === 0;

                  return (
                    <div
                      key={rev.revisionId}
                      onClick={() => setSelectedRevisionId(rev.revisionId)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative ${
                        isSelected
                          ? isDarkTheme
                            ? 'bg-[#1f222d] border-[#00bfb3] shadow-md ring-1 ring-[#00bfb3]/40'
                            : 'bg-white border-[#00bfb3] shadow-md ring-1 ring-[#00bfb3]/40'
                          : isDarkTheme
                            ? 'bg-[#191b22] border-[#2d3139] hover:border-neutral-600 hover:bg-[#1e2028]'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      {/* Revision Top line: Number + Timestamp */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                            isSelected
                              ? 'bg-[#00bfb3] text-black'
                              : isDarkTheme
                                ? 'bg-neutral-800 text-neutral-200'
                                : 'bg-slate-200 text-slate-800'
                          }`}>
                            Rev #{rev.revisionNumber}
                          </span>
                          {isLatest && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              Current
                            </span>
                          )}
                        </div>
                        <span 
                          className={`text-[11px] flex items-center gap-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}
                          title={new Date(rev.timestamp).toLocaleString()}
                        >
                          <Clock size={11} />
                          <span>{formatTime(rev.timestamp)}</span>
                        </span>
                      </div>

                      {/* Summary */}
                      <p className={`text-xs font-medium line-clamp-2 mb-2 ${
                        isDarkTheme ? 'text-neutral-200' : 'text-slate-800'
                      }`}>
                        {rev.summary || 'Workflow update'}
                      </p>

                      {/* Author row */}
                      <div className={`flex items-center justify-between pt-2 border-t ${
                        isDarkTheme ? 'border-[#2d3139]' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: rev.author.avatarColor || '#00bfb3' }}
                          >
                            {rev.author.fullName ? rev.author.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className={`text-[11px] font-semibold truncate ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>
                            {rev.author.fullName || rev.author.username}
                          </span>
                        </div>

                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                          rev.author.role === 'admin'
                            ? isDarkTheme ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isDarkTheme ? 'bg-blue-950/60 text-blue-400 border-blue-800/40' : 'bg-blue-50 text-blue-700 border-blue-300'
                        }`}>
                          {rev.author.role || 'user'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Revision Details, Diff & Rollback Inspector */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedRevision ? (
              <>
                {/* Inspector Toolbar */}
                <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 shrink-0 ${
                  isDarkTheme ? 'bg-[#181921] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {/* Left: View Tabs */}
                  <div className="flex items-center gap-2">
                    <div className={`p-0.5 rounded-lg border flex items-center ${
                      isDarkTheme ? 'bg-[#14151a] border-[#2d3139]' : 'bg-slate-200/60 border-slate-300'
                    }`}>
                      <button
                        onClick={() => setActiveTab('diff')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          activeTab === 'diff'
                            ? isDarkTheme ? 'bg-[#252834] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                            : isDarkTheme ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GitCommit size={13} className="text-[#00bfb3]" />
                        <span>Diff vs Current</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('yaml')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          activeTab === 'yaml'
                            ? isDarkTheme ? 'bg-[#252834] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                            : isDarkTheme ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileText size={13} className="text-[#3274d9]" />
                        <span>Full YAML</span>
                      </button>
                    </div>

                    <button
                      onClick={handleCopyYaml}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        isDarkTheme 
                          ? 'border-[#2d3139] hover:bg-[#252834] text-neutral-300' 
                          : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="Copy Revision YAML"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy YAML'}</span>
                    </button>
                  </div>

                  {/* Right: Rollback Action */}
                  <div className="flex items-center gap-2">
                    {isIdenticalToCurrent ? (
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                        isDarkTheme ? 'bg-neutral-800/80 text-neutral-400 border-neutral-700' : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}>
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>Matches Current Workflow</span>
                      </span>
                    ) : (
                      <button
                        onClick={handleRollback}
                        disabled={isRollingBack}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all shadow active:scale-95 cursor-pointer disabled:opacity-50"
                        title={`Rollback to Revision #${selectedRevision.revisionNumber}`}
                      >
                        <RotateCcw size={13} className={isRollingBack ? 'animate-spin' : ''} />
                        <span>{isRollingBack ? 'Restoring...' : `Rollback to Rev #${selectedRevision.revisionNumber}`}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-bar: Revision Meta details */}
                <div className={`px-5 py-2 border-b text-[11px] flex items-center justify-between flex-wrap gap-2 ${
                  isDarkTheme ? 'bg-[#15161d] border-[#2d3139] text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Revision <strong>#{selectedRevision.revisionNumber}</strong> ({selectedRevision.revisionId})
                    </span>
                    <span>•</span>
                    <span>
                      Authored by <strong className={isDarkTheme ? 'text-neutral-200' : 'text-slate-800'}>{selectedRevision.author.fullName}</strong> (@{selectedRevision.author.username})
                    </span>
                    <span>•</span>
                    <span>{new Date(selectedRevision.timestamp).toLocaleString()}</span>
                  </div>

                  <span className="font-medium text-[#00bfb3]">
                    {selectedRevision.summary}
                  </span>
                </div>

                {/* Content Panel: Diff or Full YAML */}
                <div className={`flex-1 overflow-auto p-4 font-mono text-xs ${
                  isDarkTheme ? 'bg-[#111216]' : 'bg-slate-50'
                }`}>
                  {activeTab === 'diff' ? (
                    <div>
                      {!hasDiffChanges ? (
                        <div className={`py-20 text-center ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                          <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
                          <p className="font-semibold text-sm">No differences detected</p>
                          <p className="text-xs mt-1">This revision's content is identical to the current workflow canvas.</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {diffParts.map((part, index) => {
                            let lineClass = isDarkTheme ? 'text-neutral-300' : 'text-slate-700';
                            let prefix = ' ';
                            if (part.added) {
                              lineClass = isDarkTheme 
                                ? 'bg-emerald-950/70 text-emerald-300 border-l-2 border-emerald-500 pl-1'
                                : 'bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500 pl-1';
                              prefix = '+';
                            } else if (part.removed) {
                              lineClass = isDarkTheme 
                                ? 'bg-rose-950/70 text-rose-300 border-l-2 border-rose-500 pl-1 opacity-80'
                                : 'bg-rose-50 text-rose-800 border-l-2 border-rose-500 pl-1 opacity-80';
                              prefix = '-';
                            }

                            return (
                              <div key={index} className={`whitespace-pre-wrap leading-5 py-0.5 ${lineClass}`}>
                                {part.value.split('\n').map((line, lidx, arr) => {
                                  if (lidx === arr.length - 1 && line === '') return null;
                                  return (
                                    <div key={lidx} className="flex">
                                      <span className="w-5 select-none opacity-40 shrink-0 font-bold">{prefix}</span>
                                      <span className="flex-1">{line || ' '}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <pre className={`p-3 rounded-xl border leading-relaxed overflow-x-auto whitespace-pre ${
                      isDarkTheme ? 'bg-[#181920] border-[#2d3139] text-neutral-200' : 'bg-white border-slate-300 text-slate-900'
                    }`}>
                      {selectedRevision.yaml}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className={`flex-1 flex items-center justify-center text-xs ${
                isDarkTheme ? 'text-neutral-500' : 'text-slate-400'
              }`}>
                Select a revision from the timeline on the left to inspect.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
