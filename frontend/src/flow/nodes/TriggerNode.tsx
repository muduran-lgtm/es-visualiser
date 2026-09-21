import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, Clock, Bell, Zap, AlertTriangle } from 'lucide-react';
import { WorkflowNodeData } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';

export const TriggerNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const { isDarkTheme } = useTheme();
  const nodeData = data as WorkflowNodeData;
  const triggerType = nodeData.type || 'manual';

  const getIcon = () => {
    switch (triggerType) {
      case 'manual': return <Play size={16} className="text-[#00bfb3]" />;
      case 'scheduled': return <Clock size={16} className="text-[#fec514]" />;
      case 'alert': return <Bell size={16} className="text-[#f04e98]" />;
      default: return <Zap size={16} className="text-[#00bfb3]" />;
    }
  };

  return (
    <div
      className={`min-w-[220px] rounded-lg border-2 transition-all shadow-lg overflow-hidden ${
        isDarkTheme ? 'bg-[#1d1e24]' : 'bg-white'
      } ${
        selected ? 'border-[#00bfb3] ring-2 ring-[#00bfb3]/30 shadow-[#00bfb3]/20' : 'border-[#00bfb3]/70 hover:border-[#00bfb3]'
      }`}
    >
      <div className={`px-3 py-2 border-b flex items-center justify-between ${
        isDarkTheme ? 'bg-[#00bfb3]/15 border-[#00bfb3]/30' : 'bg-teal-50 border-teal-200'
      }`}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-xs font-semibold uppercase tracking-wider text-[#00bfb3]">Trigger</span>
        </div>
        {nodeData.validationError && (
          <span title={nodeData.validationError} className="flex items-center text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded text-[10px]">
            <AlertTriangle size={12} className="mr-1 inline" /> Error
          </span>
        )}
      </div>

      <div className="p-3">
        <div className={`text-sm font-bold truncate ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{nodeData.name}</div>
        <div className={`text-xs mt-0.5 font-mono ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>{nodeData.type}</div>
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

TriggerNode.displayName = 'TriggerNode';
