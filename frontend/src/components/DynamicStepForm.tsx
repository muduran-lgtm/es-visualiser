import React, { useState, useRef } from 'react';
import { 
  Sliders, Code2, Plus, Trash2, HelpCircle, 
  ChevronDown, Layers, Terminal, Globe, Send, ShieldAlert, Sparkles, Clock, Check
} from 'lucide-react';
import { WorkflowNodeData } from '../types.js';
import { VariableItem } from '../services/graphTraverse.js';
import { VariablePicker } from './VariablePicker.js';
import catalogData from '../services/schemaCatalog.json';

interface StepTypeDefinition {
  required: string[];
  props: string[];
  withRequired: string[];
  withProps: string[];
}

interface DynamicStepFormProps {
  nodeData: WorkflowNodeData;
  onChange: (field: keyof WorkflowNodeData, value: any) => void;
  variables: VariableItem[];
  isDarkTheme: boolean;
}

export const DynamicStepForm: React.FC<DynamicStepFormProps> = ({
  nodeData,
  onChange,
  variables,
  isDarkTheme
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [rawJson, setRawJson] = useState(() => JSON.stringify(nodeData.with || {}, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showAddPropDropdown, setShowAddPropDropdown] = useState(false);

  const stepType = nodeData.type || '';
  const withObj = nodeData.with || {};

  // Schema catalog lookup
  const catalogSteps = (catalogData as any).stepTypes as Record<string, StepTypeDefinition> || {};
  const schemaDef: StepTypeDefinition | undefined = catalogSteps[stepType];

  const handleWithChange = (key: string, value: any) => {
    const updated = { ...(nodeData.with || {}), [key]: value };
    onChange('with', updated);
    setRawJson(JSON.stringify(updated, null, 2));
    setJsonError(null);
  };

  const handleRemoveWithKey = (key: string) => {
    const updated = { ...(nodeData.with || {}) };
    delete updated[key];
    onChange('with', updated);
    setRawJson(JSON.stringify(updated, null, 2));
    setJsonError(null);
  };

  const handleRawJsonChange = (text: string) => {
    setRawJson(text);
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);
      onChange('with', parsed);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  // Common UI styles
  const inputClass = `w-full text-xs px-2.5 py-1.5 rounded border focus:outline-none focus:border-[#00bfb3] transition-colors ${
    isDarkTheme 
      ? 'bg-[#121315] text-white border-[#2d3139] placeholder-neutral-500' 
      : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400'
  }`;

  const labelClass = `text-[11px] font-semibold flex items-center justify-between ${
    isDarkTheme ? 'text-neutral-300' : 'text-slate-700'
  }`;

  // Helper component for an input with variable picker attached
  const FieldWithPicker: React.FC<{
    label: string;
    fieldKey: string;
    value: any;
    isTextarea?: boolean;
    rows?: number;
    placeholder?: string;
    required?: boolean;
    description?: string;
    canRemove?: boolean;
    type?: string;
  }> = ({
    label,
    fieldKey,
    value,
    isTextarea = false,
    rows = 3,
    placeholder = '',
    required = false,
    description,
    canRemove = false,
    type = 'text'
  }) => {
    const inputRef = useRef<any>(null);

    const insertAtCursor = (expr: string) => {
      const el = inputRef.current;
      const strVal = String(value ?? '');
      if (el && typeof el.selectionStart === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = strVal.substring(0, start) + expr + strVal.substring(end);
        handleWithChange(fieldKey, next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + expr.length, start + expr.length);
        }, 50);
      } else {
        const next = strVal ? `${strVal} ${expr}` : expr;
        handleWithChange(fieldKey, next);
      }
    };

    return (
      <div className="space-y-1">
        <div className={labelClass}>
          <span className="flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-rose-400 font-bold" title="Required field">*</span>}
          </span>
          <div className="flex items-center gap-1.5">
            <VariablePicker
              variables={variables}
              onSelect={insertAtCursor}
              title={`Insert variable into ${label}`}
            />
            {canRemove && (
              <button
                type="button"
                onClick={() => handleRemoveWithKey(fieldKey)}
                className="p-1 rounded hover:bg-rose-950/40 text-neutral-500 hover:text-rose-400 transition-colors"
                title="Remove parameter"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {isTextarea ? (
          <textarea
            ref={inputRef}
            rows={rows}
            value={value ?? ''}
            onChange={(e) => handleWithChange(fieldKey, e.target.value)}
            placeholder={placeholder}
            className={`${inputClass} font-mono text-[11px] leading-relaxed`}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={value ?? ''}
            onChange={(e) => {
              const val = type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
              handleWithChange(fieldKey, val);
            }}
            placeholder={placeholder}
            className={inputClass}
          />
        )}

        {description && (
          <p className={`text-[10px] ${isDarkTheme ? 'text-neutral-500' : 'text-slate-500'}`}>
            {description}
          </p>
        )}
      </div>
    );
  };

  // Helper for specialized condition / foreach flow control fields
  const FlowControlField: React.FC<{
    label: string;
    propKey: 'condition' | 'foreach';
    value: string;
    accentColor: string;
    placeholder: string;
    hint: string;
  }> = ({ label, propKey, value, accentColor, placeholder, hint }) => {
    const inputRef = useRef<any>(null);

    const insertAtCursor = (expr: string) => {
      const el = inputRef.current;
      const strVal = value || '';
      if (el && typeof el.selectionStart === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = strVal.substring(0, start) + expr + strVal.substring(end);
        onChange(propKey, next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + expr.length, start + expr.length);
        }, 50);
      } else {
        const next = strVal ? `${strVal} ${expr}` : expr;
        onChange(propKey, next);
      }
    };

    return (
      <div className={`space-y-1.5 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold" style={{ color: accentColor }}>
            {label} *
          </label>
          <VariablePicker
            variables={variables}
            onSelect={insertAtCursor}
            title={`Insert upstream variable into ${label}`}
          />
        </div>

        {propKey === 'condition' ? (
          <textarea
            ref={inputRef}
            rows={3}
            value={value || ''}
            onChange={(e) => onChange('condition', e.target.value)}
            placeholder={placeholder}
            className={`w-full text-xs font-mono p-2 rounded border focus:outline-none ${
              isDarkTheme ? 'bg-[#121315] text-amber-200 border-[#2d3139]' : 'bg-amber-50/50 text-amber-900 border-amber-300'
            }`}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value || ''}
            onChange={(e) => onChange('foreach', e.target.value)}
            placeholder={placeholder}
            className={`w-full text-xs font-mono px-2.5 py-1.5 rounded border focus:outline-none ${
              isDarkTheme ? 'bg-[#121315] text-sky-200 border-[#2d3139]' : 'bg-blue-50/50 text-blue-900 border-blue-300'
            }`}
          />
        )}
        <p className={`text-[10px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>{hint}</p>
      </div>
    );
  };

  // Determine which specific editor to render
  const renderVisualEditor = () => {
    // 1. IF Flow Control
    if (stepType === 'if') {
      return (
        <FlowControlField
          label="Condition Expression (condition)"
          propKey="condition"
          value={nodeData.condition || ''}
          accentColor="#fec514"
          placeholder="event.alerts[0].kibana.alert.risk_score >= 80"
          hint="Evaluates boolean or KQL expression before executing steps branch."
        />
      );
    }

    // 2. FOREACH Flow Control
    if (stepType === 'foreach') {
      return (
        <FlowControlField
          label="Loop Array Expression (foreach)"
          propKey="foreach"
          value={nodeData.foreach || ''}
          accentColor="#3274d9"
          placeholder="${{ event.alerts }} or {{ steps.search.output.hits.hits }}"
          hint="Array expression to iterate over. In loop body, use {{ foreach.item }}."
        />
      );
    }

    // 3. Console Step
    if (stepType === 'console') {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="Log Message (message)"
            fieldKey="message"
            value={withObj.message}
            isTextarea
            rows={4}
            placeholder="e.g. Processing alert {{ event.alerts[0]._id }}"
            required
            description="Message or formatted expression to output to workflow execution log."
          />
          <div className="space-y-1">
            <label className={labelClass}>
              <span>Log Level</span>
            </label>
            <select
              value={withObj.level || 'info'}
              onChange={(e) => handleWithChange('level', e.target.value)}
              className={inputClass}
            >
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
              <option value="debug">debug</option>
            </select>
          </div>
        </div>
      );
    }

    // 4. Elasticsearch Search
    if (stepType === 'elasticsearch.search') {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="Target Index / Data Stream (index)"
            fieldKey="index"
            value={withObj.index}
            placeholder="logs-*, kibana-sample-*, or .alerts-security-*"
            required
            description="Target indices or data streams to search against."
          />

          <FieldWithPicker
            label="Query Body (query / ES|QL)"
            fieldKey="query"
            value={typeof withObj.query === 'object' ? JSON.stringify(withObj.query, null, 2) : withObj.query}
            isTextarea
            rows={4}
            placeholder='{ "match": { "host.name": "prod-01" } } or KQL string'
            description="Elasticsearch Query DSL object, KQL string, or lucene expression."
          />

          <div className="grid grid-cols-2 gap-2">
            <FieldWithPicker
              label="Size"
              fieldKey="size"
              value={withObj.size ?? 10}
              type="number"
              placeholder="10"
            />
            <FieldWithPicker
              label="From"
              fieldKey="from"
              value={withObj.from ?? 0}
              type="number"
              placeholder="0"
            />
          </div>

          <FieldWithPicker
            label="Sort Criteria (sort)"
            fieldKey="sort"
            value={typeof withObj.sort === 'object' ? JSON.stringify(withObj.sort) : withObj.sort}
            placeholder='[ { "@timestamp": "desc" } ]'
            description="Document sort specifications."
          />
        </div>
      );
    }

    // 5. Elasticsearch Index / Update
    if (stepType === 'elasticsearch.index' || stepType === 'elasticsearch.update') {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="Target Index (index)"
            fieldKey="index"
            value={withObj.index}
            placeholder="security-incidents-*"
            required
          />

          <FieldWithPicker
            label="Document ID (id)"
            fieldKey="id"
            value={withObj.id}
            placeholder="Optional custom ID or leave blank for auto-id"
          />

          <FieldWithPicker
            label="Document Body (document)"
            fieldKey="document"
            value={typeof withObj.document === 'object' ? JSON.stringify(withObj.document, null, 2) : withObj.document}
            isTextarea
            rows={5}
            placeholder='{ "status": "triaged", "analyst": "{{ inputs.user }}" }'
            required
            description="JSON object representing the document to index or update."
          />
        </div>
      );
    }

    // 6. Elasticsearch ES|QL Query
    if (stepType === 'elasticsearch.esql.query') {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="ES|QL Query"
            fieldKey="query"
            value={withObj.query}
            isTextarea
            rows={5}
            placeholder="FROM logs-* | WHERE response == 500 | STATS count() BY client.ip | LIMIT 10"
            required
            description="Elasticsearch Query Language pipeline expression."
          />
          <div className="space-y-1">
            <label className={labelClass}>Format</label>
            <select
              value={withObj.format || 'json'}
              onChange={(e) => handleWithChange('format', e.target.value)}
              className={inputClass}
            >
              <option value="json">json</option>
              <option value="csv">csv</option>
              <option value="tsv">tsv</option>
              <option value="text">text</option>
            </select>
          </div>
        </div>
      );
    }

    // 7. HTTP Request
    if (stepType === 'http' || stepType === 'http.request') {
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>HTTP Method</label>
            <select
              value={withObj.method || 'GET'}
              onChange={(e) => handleWithChange('method', e.target.value)}
              className={inputClass}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="HEAD">HEAD</option>
            </select>
          </div>

          <FieldWithPicker
            label="Request URL (url)"
            fieldKey="url"
            value={withObj.url}
            placeholder="https://api.external.com/v1/notify"
            required
            description="Target URL endpoint with variable support."
          />

          <FieldWithPicker
            label="Request Headers (headers)"
            fieldKey="headers"
            value={typeof withObj.headers === 'object' ? JSON.stringify(withObj.headers, null, 2) : withObj.headers}
            isTextarea
            rows={3}
            placeholder='{ "Content-Type": "application/json" }'
            description="HTTP headers dictionary."
          />

          <FieldWithPicker
            label="Request Body (body)"
            fieldKey="body"
            value={typeof withObj.body === 'object' ? JSON.stringify(withObj.body, null, 2) : withObj.body}
            isTextarea
            rows={4}
            placeholder='{ "event": "{{ steps.search.output.hits.hits[0] }}" }'
            description="JSON or plain text body payload."
          />
        </div>
      );
    }

    // 8. Slack
    if (stepType === 'slack' || stepType.startsWith('slack.')) {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="Slack Channel / User (channel)"
            fieldKey="channel"
            value={withObj.channel}
            placeholder="#security-alerts or @analyst"
            required
          />
          <FieldWithPicker
            label="Message Text (message)"
            fieldKey="message"
            value={withObj.message || withObj.text}
            isTextarea
            rows={4}
            placeholder="High Risk Alert: {{ event.alerts[0].kibana.alert.rule.name }}"
            required
          />
        </div>
      );
    }

    // 9. Jira
    if (stepType === 'jira' || stepType.startsWith('jira.')) {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="Project Key (project)"
            fieldKey="project"
            value={withObj.project}
            placeholder="SEC, IT, or INFRA"
            required
          />
          <FieldWithPicker
            label="Issue Type (issueType)"
            fieldKey="issueType"
            value={withObj.issueType || 'Incident'}
            placeholder="Incident, Task, or Bug"
            required
          />
          <FieldWithPicker
            label="Summary"
            fieldKey="summary"
            value={withObj.summary}
            placeholder="Critical Alert in {{ event.alerts[0]._source.host.name }}"
            required
          />
          <FieldWithPicker
            label="Description"
            fieldKey="description"
            value={withObj.description}
            isTextarea
            rows={4}
            placeholder="Alert Details: {{ event.alerts[0]._source }}"
          />
        </div>
      );
    }

    // 10. AI Prompt
    if (stepType.startsWith('ai.')) {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="AI Prompt (prompt)"
            fieldKey="prompt"
            value={withObj.prompt}
            isTextarea
            rows={4}
            placeholder="Summarize the threat behavior in these logs: {{ steps.search.output.hits.hits }}"
            required
          />
          <FieldWithPicker
            label="Model (model)"
            fieldKey="model"
            value={withObj.model}
            placeholder="gpt-4o, claude-3-5-sonnet, or gemini-1.5-pro"
          />
          <FieldWithPicker
            label="System Prompt (system)"
            fieldKey="system"
            value={withObj.system}
            isTextarea
            rows={2}
            placeholder="You are an expert SecOps incident response analyst."
          />
        </div>
      );
    }

    // 11. Wait step
    if (stepType === 'wait') {
      return (
        <div className="space-y-3">
          <FieldWithPicker
            label="Duration (duration)"
            fieldKey="duration"
            value={withObj.duration}
            placeholder="10s, 1m, 5m, or 1h"
            required
            description="Wait duration before continuing to the next workflow step."
          />
        </div>
      );
    }

    // 12. Generic / Schema-Catalog Step (Fallback for all other 440+ types)
    const requiredProps = schemaDef?.withRequired || [];
    const allProps = schemaDef?.withProps || [];

    // Keys currently configured in with
    const configuredKeys = Object.keys(withObj);

    // Merge required props and configured keys
    const renderedKeys = Array.from(new Set([...requiredProps, ...configuredKeys]));

    // Available keys that can be added
    const unconfiguredCatalogKeys = allProps.filter(k => !renderedKeys.includes(k));

    return (
      <div className="space-y-3">
        {renderedKeys.length === 0 ? (
          <div className={`p-3 rounded border text-center text-xs ${
            isDarkTheme ? 'border-[#2d3139] bg-[#14161d] text-neutral-400' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}>
            No parameters currently set for this step.
          </div>
        ) : (
          renderedKeys.map((key) => {
            const isReq = requiredProps.includes(key);
            const val = withObj[key];
            const isComplex = typeof val === 'object' && val !== null;

            return (
              <FieldWithPicker
                key={key}
                label={key}
                fieldKey={key}
                value={isComplex ? JSON.stringify(val, null, 2) : val}
                isTextarea={isComplex || (typeof val === 'string' && val.length > 50)}
                rows={isComplex ? 4 : 2}
                required={isReq}
                canRemove={!isReq}
                description={isReq ? 'Required parameter by Kibana schema' : undefined}
              />
            );
          })
        )}

        {/* Add Parameter Dropdown / Action */}
        <div className="pt-2 border-t border-neutral-800/40">
          {unconfiguredCatalogKeys.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddPropDropdown(!showAddPropDropdown)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                  isDarkTheme 
                    ? 'bg-[#1a1c24] hover:bg-[#232734] text-neutral-300 border-[#2d3139]' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[#00bfb3]">
                  <Plus size={13} />
                  <span>Add Schema Parameter</span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  {unconfiguredCatalogKeys.length} available
                </span>
              </button>

              {showAddPropDropdown && (
                <div className={`absolute left-0 right-0 bottom-full mb-1 max-h-48 overflow-y-auto rounded-lg shadow-xl border z-50 p-1 text-xs divide-y divide-neutral-800/30 backdrop-blur-md ${
                  isDarkTheme ? 'bg-[#181a24] border-[#2f3547] text-neutral-200' : 'bg-white border-slate-300 text-slate-800'
                }`}>
                  {unconfiguredCatalogKeys.map((propKey) => (
                    <div
                      key={propKey}
                      onClick={() => {
                        handleWithChange(propKey, '');
                        setShowAddPropDropdown(false);
                      }}
                      className={`p-1.5 rounded cursor-pointer transition-colors font-mono text-[11px] ${
                        isDarkTheme ? 'hover:bg-[#24283b] text-[#00bfb3]' : 'hover:bg-teal-50 text-teal-700'
                      }`}
                    >
                      + {propKey}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  const customKey = prompt('Enter parameter name:');
                  if (customKey && customKey.trim()) {
                    handleWithChange(customKey.trim(), '');
                  }
                }}
                className={`w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                  isDarkTheme 
                    ? 'bg-[#1a1c24] hover:bg-[#232734] text-neutral-300 border-[#2d3139]' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Plus size={12} className="text-[#00bfb3]" />
                <span>Add Custom Parameter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isFlowControl = stepType === 'if' || stepType === 'foreach';

  return (
    <div className="space-y-3">
      {/* Parameters Header with Visual / Raw JSON Segmented Switch */}
      <div className={`flex items-center justify-between pb-2 border-b ${
        isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <Sliders size={13} className="text-[#00bfb3]" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isFlowControl ? 'Flow Logic' : 'Parameters (with)'}
          </span>
        </div>

        {!isFlowControl && (
          <div className={`flex items-center p-0.5 rounded-md border text-[10px] font-semibold ${
            isDarkTheme ? 'bg-[#121316] border-[#2d3139]' : 'bg-slate-200 border-slate-300'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'visual'
                  ? 'bg-[#00bfb3] text-[#111317] font-bold shadow-xs'
                  : isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visual Form
            </button>
            <button
              type="button"
              onClick={() => {
                setRawJson(JSON.stringify(nodeData.with || {}, null, 2));
                setActiveTab('json');
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'json'
                  ? 'bg-[#00bfb3] text-[#111317] font-bold shadow-xs'
                  : isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw JSON
            </button>
          </div>
        )}
      </div>

      {/* Body: Visual or Raw JSON */}
      {activeTab === 'visual' || isFlowControl ? (
        renderVisualEditor()
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-mono ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
              Edit raw JSON object for "with":
            </span>
            {jsonError && (
              <span className="text-rose-400 text-[10px] font-semibold">
                Invalid JSON: {jsonError}
              </span>
            )}
          </div>
          <textarea
            rows={10}
            value={rawJson}
            onChange={(e) => handleRawJsonChange(e.target.value)}
            className={`w-full text-xs font-mono p-2 rounded border focus:outline-none leading-relaxed ${
              jsonError
                ? 'border-rose-500 bg-rose-950/20 text-rose-200'
                : isDarkTheme 
                  ? 'bg-[#121315] text-white border-[#2d3139]' 
                  : 'bg-white text-slate-900 border-slate-300'
            }`}
          />
          <p className={`text-[10px] ${isDarkTheme ? 'text-neutral-500' : 'text-slate-500'}`}>
            Direct JSON edits sync immediately with the workflow definition.
          </p>
        </div>
      )}
    </div>
  );
};
