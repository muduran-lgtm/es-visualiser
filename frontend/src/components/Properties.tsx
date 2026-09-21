import React, { useState, useEffect } from 'react';
import { Trash2, Info, AlertTriangle, Sparkles, Wand2, Lightbulb } from 'lucide-react';
import { CustomNode, WorkflowNodeData } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { ValidationError, QuickFix } from '../services/validator.js';

interface PropertiesProps {
  selectedNode: CustomNode | null;
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
  onUpdateNode,
  onDeleteNode,
  workflowMeta,
  validationErrors,
  onApplyQuickFix
}) => {
  const { isDarkTheme } = useTheme();
  const [formData, setFormData] = useState<Partial<WorkflowNodeData>>({});
  const [rawWithJson, setRawWithJson] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data);
      setRawWithJson(JSON.stringify(selectedNode.data.with || {}, null, 2));
      setRawJsonError(null);
    }
  }, [selectedNode]);

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

  const handleWithFieldChange = (key: string, value: any) => {
    const updatedWith = { ...(formData.with || {}), [key]: value };
    handleChange('with', updatedWith);
    setRawWithJson(JSON.stringify(updatedWith, null, 2));
  };

  const handleRawJsonChange = (text: string) => {
    setRawWithJson(text);
    try {
      const parsed = JSON.parse(text);
      setRawJsonError(null);
      handleChange('with', parsed);
    } catch (err: any) {
      setRawJsonError(err.message);
    }
  };

  const nodeData = formData;
  const isTrigger = nodeData.nodeCategory === 'trigger';
  const isIf = nodeData.type === 'if';
  const isForeach = nodeData.type === 'foreach';

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
          <div className={`text-[10px] font-mono mt-0.5 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>{nodeData.type}</div>
        </div>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className={`p-1.5 rounded transition-colors ${
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
                Kibana Şema Uyarısı ({nodeErrors.length})
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
                    <span>Öneriyi Uygula: {err.quickFix.title}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Name input */}
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

        {/* Tailored fields for IF */}
        {isIf && (
          <div className={`space-y-1 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
            <label className="text-[11px] font-semibold text-[#fec514]">Condition Expression (condition) *</label>
            <textarea
              rows={3}
              value={nodeData.condition || ''}
              onChange={(e) => handleChange('condition', e.target.value)}
              placeholder='event.alerts[0].kibana.alert.risk_score >= 80'
              className={`w-full text-xs font-mono p-2 rounded border focus:outline-none focus:border-[#fec514] ${
                isDarkTheme ? 'bg-[#121315] text-amber-200 border-[#2d3139]' : 'bg-amber-50/50 text-amber-900 border-amber-300'
              }`}
            />
            <p className={`text-[10px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>Enter a KQL or boolean Liquid expression.</p>
          </div>
        )}

        {/* Tailored fields for FOREACH */}
        {isForeach && (
          <div className={`space-y-1 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
            <label className="text-[11px] font-semibold text-[#3274d9]">Loop Array (foreach) *</label>
            <input
              type="text"
              value={nodeData.foreach || ''}
              onChange={(e) => handleChange('foreach', e.target.value)}
              placeholder='${{ event.alerts }}'
              className={`w-full text-xs font-mono px-2.5 py-1.5 rounded border focus:outline-none focus:border-[#3274d9] ${
                isDarkTheme ? 'bg-[#121315] text-sky-200 border-[#2d3139]' : 'bg-blue-50/50 text-blue-900 border-blue-300'
              }`}
            />
            <p className={`text-[10px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>Reference to array to iterate over.</p>
          </div>
        )}

        {/* Tailored fields for Console */}
        {nodeData.type === 'console' && (
          <div className={`space-y-1 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
            <label className={labelClass}>Message (with.message)</label>
            <textarea
              rows={4}
              value={nodeData.with?.message || ''}
              onChange={(e) => handleWithFieldChange('message', e.target.value)}
              placeholder="Message to log or {{ steps.prev.output }}"
              className={inputClass}
            />
          </div>
        )}

        {/* Tailored fields for Elasticsearch Search */}
        {nodeData.type === 'elasticsearch.search' && (
          <div className={`space-y-3 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
            <div className="space-y-1">
              <label className={labelClass}>Index (with.index)</label>
              <input
                type="text"
                value={nodeData.with?.index || ''}
                onChange={(e) => handleWithFieldChange('index', e.target.value)}
                placeholder="logs-* or kibana-sample-*"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Size (with.size)</label>
              <input
                type="number"
                value={nodeData.with?.size ?? 10}
                onChange={(e) => handleWithFieldChange('size', Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Raw with JSON editor for advanced/unknown */}
        {!isIf && !isForeach && (
          <div className={`space-y-1 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
            <label className={`${labelClass} flex items-center justify-between`}>
              <span>Parameters (with JSON)</span>
              {rawJsonError && <span className="text-rose-400 text-[10px]">Invalid JSON</span>}
            </label>
            <textarea
              rows={5}
              value={rawWithJson}
              onChange={(e) => handleRawJsonChange(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>
    </div>
  );
};
