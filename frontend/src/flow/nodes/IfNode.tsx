import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, AlertTriangle } from 'lucide-react';
import { WorkflowNodeData } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';

export const IfNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const { isDarkTheme } = useTheme();
  const nodeData = data as WorkflowNodeData;

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg border-2 transition-all shadow-md overflow-hidden ${
        isDarkTheme ? 'bg-[#1a1c23]' : 'bg-white'
      } ${
        selected ? 'border-[#fec514] ring-2 ring-[#fec514]/30' : 'border-[#fec514]/70 hover:border-[#fec514]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 bg-neutral-400 border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />

      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${
        isDarkTheme ? 'bg-[#fec514]/15 border-[#fec514]/30' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <GitBranch size={15} className="text-[#d99b00]" />
          <span className="text-[11px] font-bold text-[#b48000] uppercase tracking-wider">Condition (if)</span>
        </div>
        {nodeData.validationError && (
          <span title={nodeData.validationError} className="flex items-center text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded text-[10px]">
            <AlertTriangle size={11} className="mr-1 inline" /> Error
          </span>
        )}
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
