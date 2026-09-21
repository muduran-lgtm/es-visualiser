import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Repeat, AlertTriangle } from 'lucide-react';
import { WorkflowNodeData } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';

export const ForeachNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const { isDarkTheme } = useTheme();
  const nodeData = data as WorkflowNodeData;

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg border-2 transition-all shadow-md overflow-hidden ${
        isDarkTheme ? 'bg-[#1a1c23]' : 'bg-white'
      } ${
        selected ? 'border-[#3274d9] ring-2 ring-[#3274d9]/30' : 'border-[#3274d9]/70 hover:border-[#3274d9]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 bg-neutral-400 border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />

      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${
        isDarkTheme ? 'bg-[#3274d9]/15 border-[#3274d9]/30' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <Repeat size={15} className="text-[#3274d9]" />
          <span className="text-[11px] font-bold text-[#3274d9] uppercase tracking-wider">Loop (foreach)</span>
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
            ? 'text-sky-200/90 bg-black/30 border-sky-900/30' 
            : 'text-sky-900 bg-blue-50/70 border-blue-200'
        }`} title={nodeData.foreach}>
          {nodeData.foreach || 'loop expression not defined'}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 bg-[#3274d9] border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />
    </div>
  );
});

ForeachNode.displayName = 'ForeachNode';
