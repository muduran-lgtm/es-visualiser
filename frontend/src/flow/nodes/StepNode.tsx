import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Terminal, Database, Globe, Bot, Shield, AlertTriangle, 
  Loader2, CheckCircle2, XCircle 
} from 'lucide-react';
import { WorkflowNodeData } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';

export const StepNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const { isDarkTheme } = useTheme();
  const nodeData = data as WorkflowNodeData;
  const stepType = nodeData.type || 'console';

  const getStepVisuals = () => {
    if (stepType.startsWith('elasticsearch')) {
      return {
        icon: <Database size={15} className="text-[#0077cc]" />,
        color: '#0077cc',
        badge: 'Elasticsearch'
      };
    }
    if (stepType.startsWith('kibana')) {
      return {
        icon: <Shield size={15} className="text-[#f04e98]" />,
        color: '#f04e98',
        badge: 'Kibana'
      };
    }
    if (stepType.startsWith('http')) {
      return {
        icon: <Globe size={15} className="text-[#00a9e0]" />,
        color: '#00a9e0',
        badge: 'HTTP API'
      };
    }
    if (stepType.startsWith('ai')) {
      return {
        icon: <Bot size={15} className="text-[#9353d3]" />,
        color: '#9353d3',
        badge: 'AI'
      };
    }
    return {
      icon: <Terminal size={15} className="text-[#00bfb3]" />,
      color: '#3274d9',
      badge: 'Action'
    };
  };

  const visuals = getStepVisuals();
  const execStatus = nodeData.executionStatus;

  // Determine dynamic border and glowing effect based on execution & selection
  const getBorderClass = () => {
    if (execStatus === 'running') {
      return 'border-sky-400 ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/25 animate-pulse';
    }
    if (execStatus === 'completed') {
      return 'border-emerald-500/90 ring-1 ring-emerald-500/40 shadow-emerald-500/10';
    }
    if (execStatus === 'failed') {
      return 'border-rose-500 ring-2 ring-rose-500/50 shadow-rose-500/20';
    }
    if (selected) {
      return isDarkTheme 
        ? 'border-white ring-2 ring-white/25 shadow-white/10' 
        : 'border-slate-800 ring-2 ring-slate-400 shadow-lg';
    }
    return isDarkTheme
      ? 'border border-[#2d3139] hover:border-[#4b5362]'
      : 'border border-slate-300 hover:border-slate-400';
  };

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg transition-all shadow-md overflow-hidden ${
        isDarkTheme ? 'bg-[#1a1c23]' : 'bg-white'
      } ${getBorderClass()}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 bg-neutral-400 border-2 hover:scale-125 transition-transform ${
          isDarkTheme ? 'border-[#121315]' : 'border-white'
        }`}
      />

      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${
        execStatus === 'running'
          ? 'bg-sky-950/40 border-sky-500/40'
          : execStatus === 'completed'
            ? 'bg-emerald-950/30 border-emerald-500/30'
            : execStatus === 'failed'
              ? 'bg-rose-950/40 border-rose-500/40'
              : isDarkTheme ? 'bg-[#242731] border-[#2d3139]' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5">
          {visuals.icon}
          <span className={`text-[11px] font-semibold ${isDarkTheme ? 'text-neutral-300' : 'text-slate-700'}`}>
            {visuals.badge}
          </span>
        </div>

        {/* Live Execution or Schema Error Badge */}
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
            <AlertTriangle size={11} className="mr-1 inline" /> Issue
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <div className={`text-sm font-semibold truncate ${isDarkTheme ? 'text-neutral-100' : 'text-slate-900'}`} title={nodeData.name}>
          {nodeData.name}
        </div>
        <div className={`text-xs mt-1 font-mono truncate ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`} title={nodeData.type}>
          {nodeData.type}
        </div>

        {nodeData.with && Object.keys(nodeData.with).length > 0 && (
          <div className={`mt-2 pt-2 border-t text-[11px] flex items-center gap-1 font-mono truncate ${
            isDarkTheme ? 'border-[#2d3139] text-neutral-400' : 'border-slate-200 text-slate-500'
          }`}>
            <span className={isDarkTheme ? 'text-neutral-500' : 'text-slate-400'}>param:</span>
            <span className="truncate">{Object.keys(nodeData.with).join(', ')}</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 bg-[#00bfb3] border-2 hover:scale-125 transition-transform ${
          isDarkTheme ? 'border-[#121315]' : 'border-white'
        }`}
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
