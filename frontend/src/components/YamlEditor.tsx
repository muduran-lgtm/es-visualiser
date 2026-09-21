import React, { useState, useEffect, useRef, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, Diagnostic } from '@codemirror/lint';
import yaml from 'yaml';
import { 
  ChevronUp, ChevronDown, AlertCircle, CheckCircle2, 
  Copy, Check, AlertTriangle, X, Sparkles, Wand2, Lightbulb, Terminal
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { 
  validateWorkflowYaml, 
  ValidationError, 
  QuickFix, 
  applyQuickFix, 
  applyAllQuickFixes 
} from '../services/validator.js';

interface YamlEditorProps {
  value: string;
  onChange: (newValue: string, origin: 'yaml') => void;
  externalError?: string | null;
  onSwitchToExecution?: () => void;
  isRunning?: boolean;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({
  value,
  onChange,
  externalError,
  onSwitchToExecution,
  isRunning
}) => {
  const { isDarkTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorList, setShowErrorList] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Sync internal value when value prop changes from outside (e.g. Canvas or Workflow select)
  useEffect(() => {
    setInternalValue(value);
    const result = validateWorkflowYaml(value);
    setValidationErrors(result.errors);
    if (!result.valid && result.errors.length > 0) {
      setParseError(result.errors[0].message);
    } else {
      setParseError(null);
    }
  }, [value]);

  const handleCopy = () => {
    navigator.clipboard.writeText(internalValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fixableErrors = useMemo(() => {
    return validationErrors.filter(e => !!e.quickFix);
  }, [validationErrors]);

  const handleApplySingleFix = (fix: QuickFix) => {
    const updated = applyQuickFix(internalValue, fix);
    setInternalValue(updated);
    const result = validateWorkflowYaml(updated);
    setValidationErrors(result.errors);
    if (result.valid) {
      setParseError(null);
    }
    onChange(updated, 'yaml');
  };

  const handleApplyAllFixes = () => {
    const fixes = fixableErrors.map(e => e.quickFix!);
    if (fixes.length === 0) return;
    const updated = applyAllQuickFixes(internalValue, fixes);
    setInternalValue(updated);
    const result = validateWorkflowYaml(updated);
    setValidationErrors(result.errors);
    if (result.valid) {
      setParseError(null);
      setShowErrorList(false);
    }
    onChange(updated, 'yaml');
  };

  // CodeMirror linter extension with full Schema and Syntax Validation
  const workflowLinter = useMemo(() => {
    return linter((view) => {
      const docStr = view.state.doc.toString();
      const diagnostics: Diagnostic[] = [];
      const result = validateWorkflowYaml(docStr);

      for (const err of result.errors) {
        const lineNum = Math.max(1, Math.min(err.line, view.state.doc.lines));
        const docLine = view.state.doc.line(lineNum);
        const col = Math.max(1, err.col || 1);
        const from = Math.min(docLine.from + col - 1, docLine.to);
        const to = Math.min(from + Math.max(5, (err.stepName?.length || 5)), docLine.to);

        diagnostics.push({
          from,
          to: Math.max(from + 1, to),
          severity: err.severity,
          message: err.message
        });
      }

      return diagnostics;
    });
  }, []);

  const handleEditorChange = (val: string) => {
    setInternalValue(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const result = validateWorkflowYaml(val);
      setValidationErrors(result.errors);

      // Check if YAML syntax is fundamentally broken
      try {
        const doc = yaml.parseDocument(val);
        if (doc.errors && doc.errors.length > 0) {
          setParseError(`YAML Syntax Error (Line ${doc.errors[0].linePos?.[0]?.line || '?'}): ${doc.errors[0].message}`);
          return;
        }
      } catch (err: any) {
        setParseError(`Parse Error: ${err.message}`);
        return;
      }

      if (result.errors.length > 0) {
        setParseError(`${result.errors.length} validation issue(s) detected.`);
      } else {
        setParseError(null);
      }

      onChange(val, 'yaml');
    }, 300);
  };

  const jumpToLine = (lineNumber: number) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const targetLine = Math.min(Math.max(1, lineNumber), view.state.doc.lines);
    const lineInfo = view.state.doc.line(targetLine);
    view.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true
    });
    view.focus();
  };

  const activeError = parseError || externalError;
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className={`border-t transition-all flex flex-col relative ${
      isCollapsed ? 'h-9' : 'h-64'
    } ${
      isDarkTheme ? 'border-[#2d3139] bg-[#16171d]' : 'border-slate-200 bg-white'
    }`}>
      {/* Bar Header */}
      <div className={`h-9 px-3 border-b flex items-center justify-between select-none transition-colors ${
        isDarkTheme ? 'bg-[#1a1c23] border-[#2d3139]' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded transition-colors ${
              isDarkTheme ? 'hover:bg-[#282b36] text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            {isCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <span className={`text-xs font-bold uppercase tracking-wider shrink-0 ${
            isDarkTheme ? 'text-neutral-300' : 'text-slate-700'
          }`}>
            YAML Source (Bi-directional Sync)
          </span>

          {onSwitchToExecution && (
            <button
              type="button"
              onClick={onSwitchToExecution}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded transition-all border ${
                isRunning
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse font-bold'
                  : isDarkTheme
                    ? 'bg-[#232634] text-neutral-300 hover:text-white hover:bg-[#2e3245] border-[#363a4c]'
                    : 'bg-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-300 border-slate-300 font-medium'
              }`}
              title="Canlı çalıştırma ve izleme paneline geç"
            >
              <Terminal size={12} className={isRunning ? 'text-sky-400 animate-spin' : 'text-[#00bfb3]'} />
              <span>Live Monitor</span>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />}
            </button>
          )}

          {/* Validation Status Indicator */}
          {hasValidationErrors ? (
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={() => setShowErrorList(!showErrorList)}
                className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-colors shrink-0 cursor-pointer"
                title="Şema doğrulama hatalarını ve önerileri görmek için tıkla"
              >
                <AlertTriangle size={13} className="shrink-0 text-rose-400" />
                <span>{validationErrors.length} Schema Issue{validationErrors.length > 1 ? 's' : ''}</span>
                <ChevronDown size={12} className={`transition-transform ${showErrorList ? 'rotate-180' : ''}`} />
              </button>

              {fixableErrors.length > 0 && !showErrorList && (
                <button
                  onClick={handleApplyAllFixes}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors shrink-0 cursor-pointer"
                  title="Tüm düzeltilebilir hataları otomatik düzelt"
                >
                  <Sparkles size={11} />
                  <span>💡 Hızlı Düzelt ({fixableErrors.length})</span>
                </button>
              )}
            </div>
          ) : activeError ? (
            <span className="flex items-center gap-1 text-rose-400 text-xs ml-3 font-mono truncate max-w-md">
              <AlertCircle size={13} className="shrink-0" />
              <span className="truncate">{activeError}</span>
            </span>
          ) : (
            <span className={`flex items-center gap-1 text-xs ml-3 ${isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <CheckCircle2 size={13} />
              <span className="text-[11px] font-medium">Valid YAML & Kibana Schema</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              isDarkTheme 
                ? 'bg-[#232631] hover:bg-[#2c303e] text-neutral-300' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
            title="Copy YAML to Clipboard"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Validation Issues & Quick Fix Drawer */}
      {showErrorList && hasValidationErrors && !isCollapsed && (
        <div className={`absolute top-9 left-0 right-0 z-30 max-h-56 overflow-y-auto border-b shadow-xl px-4 py-2.5 text-xs transition-all ${
          isDarkTheme ? 'bg-[#1b1216] border-rose-900/60 text-neutral-200' : 'bg-rose-50/95 border-rose-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between font-bold mb-2 pb-1.5 border-b border-rose-900/30">
            <span className="text-rose-400 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Kibana Workflows Schema Validation Issues ({validationErrors.length})
            </span>
            <div className="flex items-center gap-2">
              {fixableErrors.length > 0 && (
                <button
                  onClick={handleApplyAllFixes}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                  title="Tüm önerileri ve şema düzeltmelerini tek tıkla uygula"
                >
                  <Sparkles size={12} />
                  <span>Tümünü Düzelt ({fixableErrors.length})</span>
                </button>
              )}
              <button 
                onClick={() => setShowErrorList(false)}
                className="p-1 rounded hover:bg-rose-500/20 text-neutral-400 hover:text-white cursor-pointer"
                title="Kapat"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {validationErrors.map((err, i) => (
              <div 
                key={i}
                className={`p-2 rounded flex items-center justify-between gap-3 transition-colors ${
                  isDarkTheme 
                    ? 'bg-[#23171d] hover:bg-[#2c1d25] border border-rose-900/40' 
                    : 'bg-white hover:bg-rose-100/60 border border-rose-200 shadow-xs'
                }`}
              >
                <div 
                  onClick={() => jumpToLine(err.line)}
                  className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0"
                  title="Tıklayarak YAML editöründe ilgili satıra git"
                >
                  <span className="font-mono px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-400 shrink-0">
                    Satır {err.line}:{err.col}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] leading-tight text-neutral-200 font-medium">
                      {err.message}
                    </div>
                    {err.quickFix && (
                      <div className="text-[11px] text-amber-400 flex items-center gap-1.5 mt-1 font-sans">
                        <Lightbulb size={12} className="shrink-0 text-amber-400" />
                        <span className="font-semibold">Öneri:</span>
                        <span className="opacity-95">{err.quickFix.title}</span>
                      </div>
                    )}
                  </div>
                </div>

                {err.quickFix && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplySingleFix(err.quickFix!);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-500/60 shrink-0 transition-colors cursor-pointer"
                    title={err.quickFix.description || err.quickFix.title}
                  >
                    <Wand2 size={12} />
                    <span>Hızlı Düzelt</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CodeMirror Editor */}
      {!isCollapsed && (
        <div className="flex-1 overflow-auto text-xs font-mono">
          <CodeMirror
            ref={editorRef}
            value={internalValue}
            height="100%"
            theme={isDarkTheme ? oneDark : 'light'}
            extensions={[yamlLang(), workflowLinter]}
            onChange={handleEditorChange}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: false,
              indentOnInput: true
            }}
          />
        </div>
      )}
    </div>
  );
};
