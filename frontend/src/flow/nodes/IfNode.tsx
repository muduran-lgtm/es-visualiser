import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { WorkflowNodeData } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';

export const IfNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const { isDarkTheme } = useTheme();
  const nodeData = data as WorkflowNodeData;
  const execStatus = nodeData.executionStatus;

  const getBorderClass = () => {
    if (execStatus === 'running') {
      return 'border-sky-400 ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/25 animate-pulse';
    }
    if (execStatus === 'completed') {
      return 'border-emerald-500 ring-1 ring-emerald-500/40';
    }
    if (execStatus === 'failed') {
      return 'border-rose-500 ring-2 ring-rose-500/50 shadow-rose-500/20';
    }
    if (selected) {
      return 'border-[#fec514] ring-2 ring-[#fec514]/30';
    }
    return 'border-[#fec514]/70 hover:border-[#fec514]';
  };

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg border-2 transition-all shadow-md overflow-hidden ${
        isDarkTheme ? 'bg-[#1a1c23]' : 'bg-white'
      } ${getBorderClass()}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 bg-neutral-400 border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />

      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${
        execStatus === 'running'
          ? 'bg-sky-950/40 border-sky-500/40'
          : execStatus === 'completed'
            ? 'bg-emerald-950/30 border-emerald-500/30'
            : execStatus === 'failed'
              ? 'bg-rose-950/40 border-rose-500/40'
              : isDarkTheme ? 'bg-[#fec514]/15 border-[#fec514]/30' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <GitBranch size={15} className="text-[#d99b00]" />
          <span className="text-[11px] font-bold text-[#b48000] uppercase tracking-wider">Condition (if)</span>
        </div>

        {execStatus === 'running' ? (
          <span className="flex items-center gap-1 text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-sky-500/40">
            <Loader2 size={11} className="animate-spin text-sky-400" /> Running
          </span>
        ) : execStatus === 'completed' ? (
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono border border-emerald-500/40">
            <CheckCircle2 size={11} className="text-emerald-400" /> {nodeData.executionTimeMs !== undefined ? `${nodeData.executionTimeMs}ms` : 'Done'}
          </span>
        ) : execStatus === 'failed' ? (
          <span className="flex items-center gap-1 text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-rose-500/40">
            <XCircle size={11} className="text-rose-400" /> Failed
          </span>
        ) : nodeData.validationError ? (
          <span title={nodeData.validationError} className="flex items-center text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded text-[10px]">
            <AlertTriangle size={11} className="mr-1 inline" /> Error
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <div className={`text-sm font-semibold truncate ${isDarkTheme ? 'text-neutral-100' : 'text-slate-900'}`}>
          {nodeData.name}
        </div>
        <div className={`text-xs mt-1 font-mono p-1.5 rounded border truncate ${
          isDarkTheme 
            ? 'text-amber-200/90 bg-black/30 border-amber-900/30' 
            : 'text-amber-900 bg-amber-50/70 border-amber-200'
        }`} title={nodeData.condition}>
          {nodeData.condition || 'condition not defined'}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 bg-[#fec514] border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />
    </div>
  );
});

IfNode.displayName = 'IfNode';
