import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Info, AlertTriangle, Sparkles, Wand2, Lightbulb,
  CheckCircle2, XCircle, Clock, Loader2, Copy, Check, Terminal 
} from 'lucide-react';
import { Edge } from '@xyflow/react';
import { CustomNode, WorkflowNodeData } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { ValidationError, QuickFix } from '../services/validator.js';
import { sanitizeSensitiveData, sanitizeSensitiveString } from '../services/sanitizer.js';
import { getAvailableVariables } from '../services/graphTraverse.js';
import { DynamicStepForm } from './DynamicStepForm.js';

interface PropertiesProps {
  selectedNode: CustomNode | null;
  nodes?: CustomNode[];
  edges?: Edge[];
  onUpdateNode: (id: string, updatedData: Partial<WorkflowNodeData>) => void;
  onDeleteNode: (id: string) => void;
  workflowMeta?: {
    name: string;
    description?: string;
    enabled: boolean;
    tags?: string[];
  };
  validationErrors?: ValidationError[];
  onApplyQuickFix?: (fix: QuickFix) => void;
}

export const Properties: React.FC<PropertiesProps> = ({
  selectedNode,
  nodes = [],
  edges = [],
  onUpdateNode,
  onDeleteNode,
  workflowMeta,
  validationErrors,
  onApplyQuickFix
}) => {
  const { isDarkTheme } = useTheme();
  const [formData, setFormData] = useState<Partial<WorkflowNodeData>>({});
  const [outputCopied, setOutputCopied] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data);
    }
  }, [selectedNode]);

  // Compute available upstream output variables
  const availableVariables = useMemo(() => {
    if (!selectedNode || !nodes || !edges) return [];
    return getAvailableVariables(selectedNode.id, nodes, edges);
  }, [selectedNode, nodes, edges]);

  if (!selectedNode) {
    return (
      <div className={`w-80 border-l flex flex-col h-full select-none transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#18191f] border-[#2d3139] text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}>
        <div className={`p-3 border-b font-bold text-xs uppercase tracking-wider ${
          isDarkTheme ? 'border-[#2d3139] text-neutral-400' : 'border-slate-200 text-slate-600'
        }`}>
          Workflow Properties
        </div>
        <div className="p-4 space-y-4 text-xs">
          <div className={`p-3 rounded border space-y-2 ${
            isDarkTheme ? 'bg-[#20222a] border-[#2d3139]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className={`text-[11px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>Selected Workflow:</div>
            <div className={`font-semibold text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{workflowMeta?.name || 'Untitled'}</div>
            {workflowMeta?.description && (
              <div className={isDarkTheme ? 'text-neutral-400 text-xs' : 'text-slate-600 text-xs'}>{workflowMeta.description}</div>
            )}
            <div className={`flex items-center gap-2 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                workflowMeta?.enabled 
                  ? isDarkTheme ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : isDarkTheme ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-200 text-slate-600'
              }`}>
                {workflowMeta?.enabled ? 'Enabled' : 'Disabled'}
              </span>
              {workflowMeta?.tags?.map(t => (
                <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] ${
                  isDarkTheme ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className={`text-center py-8 space-y-2 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
            <Info size={28} className="mx-auto opacity-70" />
            <p>Click on a node on the canvas to inspect and edit its properties.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (field: keyof WorkflowNodeData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdateNode(selectedNode.id, { [field]: value });
  };

  const nodeData = formData as WorkflowNodeData;
  const isTrigger = nodeData.nodeCategory === 'trigger';

  const inputClass = `w-full text-xs px-2.5 py-1.5 rounded border focus:outline-none focus:border-[#00bfb3] transition-colors ${
    isDarkTheme 
      ? 'bg-[#121315] text-white border-[#2d3139] placeholder-neutral-500' 
      : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400'
  }`;

  const labelClass = `text-[11px] font-semibold ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`;

  const nodeErrors = (validationErrors || []).filter(
    e => e.stepName && e.stepName === nodeData.name
  );

  return (
    <div className={`w-80 border-l flex flex-col h-full select-none transition-colors duration-200 ${
      isDarkTheme ? 'bg-[#18191f] border-[#2d3139] text-neutral-200' : 'bg-slate-50 border-slate-200 text-slate-800'
    }`}>
      {/* Header */}
      <div className={`p-3 border-b flex items-center justify-between ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
        <div>
          <div className={`text-xs font-bold uppercase tracking-wider ${isDarkTheme ? 'text-neutral-200' : 'text-slate-800'}`}>
            {isTrigger ? 'Trigger Properties' : 'Step Properties'}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${isDarkTheme ? 'text-[#00bfb3]' : 'text-teal-700'}`}>
            {nodeData.type}
          </div>
        </div>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            isDarkTheme 
              ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40' 
              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
          }`}
          title="Delete Node"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* Live Execution Results Card */}
        {nodeData.executionStatus && (
          <div className={`p-3 rounded-lg border space-y-2 ${
            nodeData.executionStatus === 'completed'
              ? isDarkTheme ? 'bg-[#15231e] border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
              : nodeData.executionStatus === 'failed'
                ? isDarkTheme ? 'bg-[#26151a] border-rose-800/60' : 'bg-rose-50 border-rose-200'
                : isDarkTheme ? 'bg-[#151c27] border-sky-800/60' : 'bg-sky-50 border-sky-200'
          }`}>
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-700/30">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {nodeData.executionStatus === 'running' && <Loader2 size={13} className="animate-spin text-sky-400" />}
                {nodeData.executionStatus === 'completed' && <CheckCircle2 size={13} className="text-emerald-400" />}
                {nodeData.executionStatus === 'failed' && <XCircle size={13} className="text-rose-400" />}
                <span className={
                  nodeData.executionStatus === 'completed' ? 'text-emerald-400' :
                  nodeData.executionStatus === 'failed' ? 'text-rose-400' : 'text-sky-400'
                }>
                  Execution: {nodeData.executionStatus.toUpperCase()}
                </span>
              </div>
              {nodeData.executionTimeMs !== undefined && (
                <span className="font-mono text-[11px] text-neutral-400">
                  {nodeData.executionTimeMs} ms
                </span>
              )}
            </div>

            {nodeData.executionError && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-900/60 text-rose-300 font-mono text-[11px] break-words">
                <div className="font-bold text-[10px] text-rose-400 uppercase">Error:</div>
                <div>{typeof nodeData.executionError === 'object' ? JSON.stringify(sanitizeSensitiveData(nodeData.executionError), null, 2) : sanitizeSensitiveString(String(nodeData.executionError))}</div>
              </div>
            )}

            {nodeData.executionOutput && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-neutral-400">
                  <span>Output State:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(sanitizeSensitiveData(nodeData.executionOutput), null, 2));
                      setOutputCopied(true);
                      setTimeout(() => setOutputCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 text-[10px] hover:text-white transition-colors cursor-pointer"
                  >
                    {outputCopied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    <span>{outputCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className={`p-2 rounded font-mono text-[10px] max-h-36 overflow-auto border leading-relaxed ${
                  isDarkTheme ? 'bg-[#0d0f14] border-[#1e2330] text-emerald-300' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {JSON.stringify(sanitizeSensitiveData(nodeData.executionOutput), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Smart Schema Suggestion & Quick Fix Card */}
        {nodeErrors.length > 0 && (
          <div className={`p-3 rounded-lg border space-y-2.5 ${
            isDarkTheme 
              ? 'bg-[#23171d] border-rose-900/60 text-neutral-200' 
              : 'bg-rose-50/90 border-rose-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between font-bold text-xs pb-1 border-b border-rose-900/30">
              <span className="text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Kibana Schema Warning ({nodeErrors.length})
              </span>
            </div>
            {nodeErrors.map((err, i) => (
              <div key={i} className="text-[11px] space-y-2 pt-1 first:pt-0">
                <p className="font-mono text-[11px] leading-tight text-neutral-300">
                  {err.message}
                </p>
                {err.quickFix && onApplyQuickFix && (
                  <button
                    type="button"
                    onClick={() => onApplyQuickFix(err.quickFix!)}
                    className="flex items-center gap-1.5 w-full justify-center px-2.5 py-1.5 rounded-md font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-500/60 transition-colors text-[11px] cursor-pointer"
                    title={err.quickFix.description || err.quickFix.title}
                  >
                    <Wand2 size={12} />
                    <span>Apply Fix: {err.quickFix.title}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Name input (for step nodes) */}
        {!isTrigger && (
          <div className="space-y-1">
            <label className={`${labelClass} flex items-center justify-between`}>
              <span>Step Name (name) *</span>
              {nodeData.validationError && (
                <span className="text-rose-400 flex items-center gap-1 text-[10px]">
                  <AlertTriangle size={11} /> {nodeData.validationError}
                </span>
              )}
            </label>
            <input
              type="text"
              value={nodeData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Description input */}
        <div className="space-y-1">
          <label className={labelClass}>Description (description)</label>
          <input
            type="text"
            value={nodeData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional step description"
            className={inputClass}
          />
        </div>

        {/* Type Display */}
        <div className="space-y-1">
          <label className={labelClass}>Type (type)</label>
          <input
            type="text"
            readOnly
            value={nodeData.type || ''}
            className={`w-full text-xs px-2.5 py-1.5 rounded border cursor-not-allowed font-mono ${
              isDarkTheme ? 'bg-[#14151a] text-neutral-400 border-[#2d3139]' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          />
        </div>

        {/* Step-Aware Dynamic Form Engine */}
        <div className="pt-2">
          <DynamicStepForm
            nodeData={nodeData}
            onChange={handleChange}
            variables={availableVariables}
            isDarkTheme={isDarkTheme}
          />
        </div>
      </div>
    </div>
  );
};
