import React, { useState, useEffect } from 'react';
import { 
  Play, Square, Loader2, CheckCircle2, XCircle, Clock, 
  ChevronUp, ChevronDown, Copy, Check, Terminal, History, X, RefreshCw, AlertTriangle, Code
} from 'lucide-react';
import { WorkflowExecutionDetail, WorkflowExecutionSummary, StepExecutionDetail } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { sanitizeSensitiveData, sanitizeSensitiveString } from '../services/sanitizer.js';

interface ExecutionDrawerProps {
  currentWorkflowId: string;
  workflowName: string;
  activeExecution: WorkflowExecutionDetail | null;
  isRunning: boolean;
  onTriggerRun: () => void;
  onCancelRun: () => void;
  onSelectExecution: (execId: string) => void;
  executionHistory: WorkflowExecutionSummary[];
  onRefreshHistory: () => void;
  onSelectStepNode?: (stepName: string) => void;
  onSwitchToYaml?: () => void;
}

export const ExecutionDrawer: React.FC<ExecutionDrawerProps> = ({
  currentWorkflowId,
  workflowName,
  activeExecution,
  isRunning,
  onTriggerRun,
  onCancelRun,
  onSelectExecution,
  executionHistory,
  onRefreshHistory,
  onSelectStepNode,
  onSwitchToYaml
}) => {
  const { isDarkTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer tick when execution is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      const start = activeExecution?.startedAt ? new Date(activeExecution.startedAt).getTime() : Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      interval = setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      }, 1000);
    } else {
      if (activeExecution?.duration) {
        setElapsedSeconds(Math.round(activeExecution.duration / 1000));
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, activeExecution]);

  // Auto-select latest running or failed step
  useEffect(() => {
    if (activeExecution && activeExecution.stepExecutions.length > 0) {
      if (selectedStepIndex === null || selectedStepIndex >= activeExecution.stepExecutions.length) {
        setSelectedStepIndex(activeExecution.stepExecutions.length - 1);
      }
    }
  }, [activeExecution?.stepExecutions.length]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const steps = activeExecution?.stepExecutions || [];
  const selectedStep: StepExecutionDetail | null = 
    selectedStepIndex !== null && steps[selectedStepIndex] ? steps[selectedStepIndex] : null;

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;

  return (
    <div className={`border-t transition-all flex flex-col relative z-20 ${
      isCollapsed ? 'h-9' : 'h-64'
    } ${
      isDarkTheme ? 'border-[#2d3139] bg-[#14161d]' : 'border-slate-200 bg-white'
    }`}>
      {/* Top Header Bar */}
      <div className={`h-9 px-3 border-b flex items-center justify-between select-none shrink-0 ${
        isDarkTheme ? 'bg-[#1a1c24] border-[#2d3139]' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded transition-colors ${
              isDarkTheme ? 'hover:bg-[#282b36] text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            {isCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
            isDarkTheme ? 'text-neutral-300' : 'text-slate-700'
          }`}>
            <Terminal size={14} className="text-[#00bfb3]" />
            Live Execution Monitor
          </span>

          {onSwitchToYaml && (
            <button
              type="button"
              onClick={onSwitchToYaml}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded transition-all border ${
                isDarkTheme
                  ? 'bg-[#232634] text-neutral-300 hover:text-white hover:bg-[#2e3245] border-[#363a4c]'
                  : 'bg-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-300 border-slate-300'
              }`}
              title="Switch to YAML Source editor"
            >
              <Code size={12} className="text-[#00bfb3]" />
              <span>YAML Source</span>
            </button>
          )}

          {/* Execution Status Badge */}
          {activeExecution ? (
            <div className="flex items-center gap-2 ml-2">
              {isRunning ? (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 animate-pulse">
                  <Loader2 size={12} className="animate-spin text-sky-400" />
                  <span>Running ({elapsedSeconds}s)</span>
                </span>
              ) : activeExecution.status === 'completed' ? (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Success ({activeExecution.duration ? `${(activeExecution.duration / 1000).toFixed(1)}s` : `${elapsedSeconds}s`})</span>
                </span>
              ) : activeExecution.status === 'failed' ? (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <XCircle size={12} className="text-rose-400" />
                  <span>Failed</span>
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
                  {activeExecution.status}
                </span>
              )}

              {totalSteps > 0 && (
                <span className={`text-[11px] font-mono ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {completedCount}/{totalSteps} steps completed
                </span>
              )}

              <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[120px]" title={activeExecution.id}>
                ID: {activeExecution.id.substring(0, 8)}...
              </span>
            </div>
          ) : (
            <span className={`text-[11px] ml-2 ${isDarkTheme ? 'text-neutral-500' : 'text-slate-400'}`}>
              (Ready to run test execution)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Run / Stop Button */}
          {isRunning ? (
            <button
              onClick={onCancelRun}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-xs"
              title="Cancel Execution"
            >
              <Square size={12} className="fill-current" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              onClick={onTriggerRun}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-[#00bfb3] hover:bg-[#00a89d] text-[#111317] transition-all cursor-pointer shadow-sm active:scale-95"
              title="Run and test workflow on Kibana"
            >
              <Play size={12} className="fill-current" />
              <span>Run Test</span>
            </button>
          )}

          {/* Execution History Button */}
          <button
            onClick={() => {
              onRefreshHistory();
              setShowHistoryModal(!showHistoryModal);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              isDarkTheme 
                ? 'bg-[#232633] hover:bg-[#2c3040] text-neutral-300' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
            title="View execution history"
          >
            <History size={13} />
            <span>History ({executionHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Main Drawer Body (Split View: Steps Timeline on Left, Step Output Inspector on Right) */}
      {!isCollapsed && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Steps Timeline */}
          <div className={`w-80 border-r flex flex-col overflow-y-auto ${
            isDarkTheme ? 'border-[#2d3139] bg-[#171922]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className={`px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider ${
              isDarkTheme ? 'border-[#2d3139] text-neutral-400' : 'border-slate-200 text-slate-500'
            }`}>
              Execution Steps ({steps.length})
            </div>

            {steps.length === 0 ? (
              <div className={`p-6 text-center text-xs ${isDarkTheme ? 'text-neutral-500' : 'text-slate-400'}`}>
                {isRunning ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={20} className="animate-spin text-sky-400" />
                    <span>Executing workflow steps...</span>
                  </div>
                ) : (
                  <span>No execution has been triggered yet. Click "Run Test" to execute the workflow.</span>
                )}
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/40">
                {steps.map((step, idx) => {
                  const isSelected = selectedStepIndex === idx;
                  return (
                    <div
                      key={step.id || idx}
                      onClick={() => {
                        setSelectedStepIndex(idx);
                        if (onSelectStepNode) {
                          onSelectStepNode(step.stepId);
                        }
                      }}
                      className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? isDarkTheme 
                            ? 'bg-[#222634] border-l-2 border-[#00bfb3]' 
                            : 'bg-emerald-50/80 border-l-2 border-[#00bfb3]'
                          : isDarkTheme 
                            ? 'hover:bg-[#1e202b]' 
                            : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {step.status === 'running' ? (
                          <Loader2 size={13} className="animate-spin text-sky-400 shrink-0" />
                        ) : step.status === 'completed' ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : step.status === 'failed' ? (
                          <XCircle size={13} className="text-rose-400 shrink-0" />
                        ) : (
                          <Clock size={13} className="text-neutral-500 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className={`text-xs font-semibold truncate ${
                            isSelected 
                              ? isDarkTheme ? 'text-white' : 'text-slate-900' 
                              : isDarkTheme ? 'text-neutral-200' : 'text-slate-700'
                          }`}>
                            {step.stepId}
                          </div>
                          <div className={`text-[10px] font-mono truncate ${
                            isDarkTheme ? 'text-neutral-400' : 'text-slate-500'
                          }`}>
                            {step.stepType || 'step'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {step.executionTimeMs !== undefined && (
                          <span className="font-mono text-[10px] text-neutral-400">
                            {step.executionTimeMs}ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Step Output & Details Inspector */}
          <div className={`flex-1 flex flex-col overflow-hidden ${
            isDarkTheme ? 'bg-[#12141a]' : 'bg-white'
          }`}>
            {selectedStep ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Step Sub-Header */}
                <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
                  isDarkTheme ? 'border-[#2d3139] bg-[#181a22]' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{selectedStep.stepId}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {selectedStep.stepType}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      selectedStep.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedStep.status === 'failed'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-sky-950 text-sky-400 border border-sky-800'
                    }`}>
                      {selectedStep.status}
                    </span>
                    {selectedStep.executionTimeMs !== undefined && (
                      <span className="text-[11px] font-mono text-neutral-400">
                        ({selectedStep.executionTimeMs} ms)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopy(JSON.stringify(sanitizeSensitiveData(selectedStep.state || selectedStep.error || {}), null, 2))}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                      isDarkTheme ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-slate-200 text-slate-700'
                    }`}
                    title="Copy Output JSON"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                {/* Error Banner if Step Failed */}
                {selectedStep.error && (
                  <div className="p-3 bg-rose-950/40 border-b border-rose-900/50 text-rose-300 text-xs font-mono flex items-start gap-2">
                    <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Execution Error:</div>
                      <div>{typeof selectedStep.error === 'object' ? JSON.stringify(sanitizeSensitiveData(selectedStep.error), null, 2) : sanitizeSensitiveString(String(selectedStep.error))}</div>
                    </div>
                  </div>
                )}

                {/* Output Data / JSON Tree */}
                <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                  <div className="text-[11px] font-bold uppercase text-neutral-400 mb-1.5">
                    Step Output (state):
                  </div>
                  <pre className={`p-3 rounded-lg border overflow-x-auto leading-relaxed ${
                    isDarkTheme 
                      ? 'bg-[#0e0f14] border-[#222530] text-emerald-300' 
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}>
                    {selectedStep.state 
                      ? JSON.stringify(sanitizeSensitiveData(selectedStep.state), null, 2) 
                      : selectedStep.error 
                        ? JSON.stringify(sanitizeSensitiveData(selectedStep.error), null, 2)
                        : '// No output state recorded for this step.'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className={`flex-1 flex items-center justify-center text-xs ${
                isDarkTheme ? 'text-neutral-500' : 'text-slate-400'
              }`}>
                Click on a step in the left timeline or canvas to inspect its live outputs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className={`absolute bottom-9 right-4 w-96 max-h-72 rounded-xl shadow-2xl border flex flex-col z-50 overflow-hidden ${
          isDarkTheme ? 'bg-[#1a1c24] border-[#2d3139] text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="p-3 border-b flex items-center justify-between font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <History size={14} className="text-[#00bfb3]" />
              Execution History ({executionHistory.length})
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={onRefreshHistory}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                title="Close"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/40 text-xs">
            {executionHistory.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                No recorded execution history found.
              </div>
            ) : (
              executionHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectExecution(item.id);
                    setShowHistoryModal(false);
                  }}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isDarkTheme ? 'hover:bg-[#232633]' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      {item.status === 'completed' ? (
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      ) : item.status === 'failed' ? (
                        <XCircle size={12} className="text-rose-400 shrink-0" />
                      ) : (
                        <Clock size={12} className="text-sky-400 shrink-0" />
                      )}
                      <span className="font-semibold truncate">{item.id.substring(0, 16)}...</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {new Date(item.startedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      item.status === 'completed' ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                    }`}>
                      {item.status}
                    </span>
                    {item.duration && (
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {(item.duration / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
