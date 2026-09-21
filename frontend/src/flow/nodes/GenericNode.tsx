import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import { WorkflowNodeData } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';

export const GenericNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const { isDarkTheme } = useTheme();
  const nodeData = data as WorkflowNodeData;

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg border-2 border-dashed transition-all shadow-md overflow-hidden ${
        isDarkTheme ? 'bg-[#1a1c23]' : 'bg-white'
      } ${
        selected ? 'border-purple-400 ring-2 ring-purple-400/30' : 'border-purple-600/70 hover:border-purple-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 bg-purple-400 border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />

      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${
        isDarkTheme ? 'bg-purple-950/30 border-purple-800/40' : 'bg-purple-50 border-purple-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <HelpCircle size={15} className="text-purple-400" />
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Custom / Generic</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          isDarkTheme ? 'text-purple-300 bg-purple-900/50' : 'text-purple-700 bg-purple-100'
        }`}>
          Raw Field
        </span>
      </div>

      <div className="p-3">
        <div className={`text-sm font-semibold truncate ${isDarkTheme ? 'text-neutral-100' : 'text-slate-900'}`}>{nodeData.name}</div>
        <div className={`text-xs mt-1 font-mono truncate ${isDarkTheme ? 'text-purple-200' : 'text-purple-800'}`} title={nodeData.type}>
          {nodeData.type}
        </div>
        <div className={`mt-2 text-[10px] italic ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
          Preserved as raw YAML
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 bg-purple-400 border-2 ${isDarkTheme ? 'border-[#121315]' : 'border-white'}`}
      />
    </div>
  );
});

GenericNode.displayName = 'GenericNode';
