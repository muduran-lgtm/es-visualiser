import yaml from 'yaml';
import catalogData from './schemaCatalog.json';

export interface QuickFix {
  id: string;
  title: string;
  description?: string;
  action: 'set_field' | 'create_loop_body' | 'create_if_body' | 'fix_term_query' | 'rename_field' | 'custom';
  targetPath: (string | number)[];
  value?: any;
  oldKey?: string;
  newKey?: string;
}

export interface ValidationError {
  message: string;
  path?: (string | number)[];
  line: number;
  col: number;
  stepName?: string;
  severity: 'error' | 'warning';
  quickFix?: QuickFix;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  errorsByStep: Map<string, string[]>;
}

interface StepTypeDefinition {
  required: string[];
  props: string[];
  withRequired: string[];
  withProps: string[];
}

interface TriggerTypeDefinition {
  required: string[];
  withRequired: string[];
}

interface SchemaCatalog {
  stepTypes: Record<string, StepTypeDefinition>;
  triggerTypes: Record<string, TriggerTypeDefinition>;
}

const catalog = catalogData as unknown as SchemaCatalog;

function findPosition(
  doc: yaml.Document,
  lc: yaml.LineCounter,
  path: (string | number)[]
): { line: number; col: number } {
  try {
    const node = doc.getIn(path, true) as any;
    if (node && node.range) {
      return lc.linePos(node.range[0]);
    }
  } catch {}
  return { line: 1, col: 1 };
}

export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

function findClosestMatch(target: string, candidates: string[]): string | null {
  let bestMatch: string | null = null;
  let minDistance = Infinity;
  const lowerTarget = target.toLowerCase();

  for (const cand of candidates) {
    const dist = levenshteinDistance(lowerTarget, cand.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = cand;
    }
  }

  return minDistance <= 2 ? bestMatch : null;
}

function getDefaultWithVal(key: string): any {
  switch (key) {
    case 'index': return 'logs-*';
    case 'message': return 'Notification or log message';
    case 'duration': return '5s';
    case 'query': return 'FROM logs-* | LIMIT 10';
    case 'method': return 'POST';
    case 'path': return '/logs-*/_search';
    case 'url': return 'https://example.com/api';
    default: return '';
  }
}

function flattenSteps(steps: any[]): any[] {
  const list: any[] = [];
  function recurse(arr: any[]) {
    if (!Array.isArray(arr)) return;
    for (const s of arr) {
      list.push(s);
      if (Array.isArray(s.steps)) recurse(s.steps);
      if (Array.isArray(s.else)) recurse(s.else);
    }
  }
  recurse(steps);
  return list;
}

function inferForeachExpression(allSteps: any[], currentStepName: string): string {
  const flat = flattenSteps(allSteps);
  const currentIdx = flat.findIndex(s => s?.name === currentStepName);
  const preceding = currentIdx > 0 ? flat.slice(0, currentIdx) : flat;

  // Search backward for most relevant data-producing step
  for (let i = preceding.length - 1; i >= 0; i--) {
    const s = preceding[i];
    if (!s || s.name === currentStepName) continue;

    if (s.type === 'elasticsearch.search') {
      if (s.with?.aggs && typeof s.with.aggs === 'object') {
        const aggKeys = Object.keys(s.with.aggs);
        if (aggKeys.length > 0) {
          return `{{ steps.${s.name}.output.aggregations.${aggKeys[0]}.buckets }}`;
        }
      }
      return `{{ steps.${s.name}.output.hits.hits }}`;
    }

    if (s.type === 'elasticsearch.esql.query') {
      return `{{ steps.${s.name}.output.values }}`;
    }
  }

  return '{{ steps.previous.output }}';
}

/**
 * Validates Workflow YAML syntax and official Kibana Workflows schema rules (445+ step types).
 * Generates smart quick-fix suggestions for detected errors.
 */
export function validateWorkflowYaml(yamlString: string): ValidationResult {
  if (!yamlString || !yamlString.trim()) {
    return {
      valid: false,
      errors: [{ message: 'Workflow YAML cannot be empty.', line: 1, col: 1, severity: 'error' }],
      errorsByStep: new Map()
    };
  }

  const lc = new yaml.LineCounter();
  let doc: yaml.Document;
  try {
    doc = yaml.parseDocument(yamlString, { lineCounter: lc, keepSourceTokens: true });
  } catch (err: any) {
    return {
      valid: false,
      errors: [{ message: `YAML parse error: ${err.message}`, line: 1, col: 1, severity: 'error' }],
      errorsByStep: new Map()
    };
  }

  const errors: ValidationError[] = [];
  const errorsByStep = new Map<string, string[]>();

  const addStepError = (stepName: string, msg: string) => {
    if (!stepName) return;
    const existing = errorsByStep.get(stepName) || [];
    existing.push(msg);
    errorsByStep.set(stepName, existing);
  };

  // 1. YAML Syntax Errors
  if (doc.errors && doc.errors.length > 0) {
    for (const e of doc.errors) {
      const line = e.linePos ? e.linePos[0].line : 1;
      const col = e.linePos ? e.linePos[0].col : 1;
      errors.push({
        message: `YAML Syntax Error: ${e.message}`,
        line,
        col,
        severity: 'error'
      });
    }
    return { valid: false, errors, errorsByStep };
  }

  const json = doc.toJSON() || {};
  const allWorkflowSteps = Array.isArray(json.steps) ? json.steps : [];

  // 2. Workflow Metadata Validation
  if (!json.name || typeof json.name !== 'string' || !json.name.trim()) {
    const pos = findPosition(doc, lc, ['name']);
    errors.push({
      message: 'Workflow "name" is required and cannot be empty.',
      path: ['name'],
      line: pos.line,
      col: pos.col,
      severity: 'error',
      quickFix: {
        id: 'fix-workflow-name',
        title: 'Set workflow name: "My Workflow"',
        description: 'Specifies a required unique name for the workflow.',
        action: 'set_field',
        targetPath: ['name'],
        value: 'My Workflow'
      }
    });
  }

  // 3. Triggers Validation against Catalog
  if (!json.triggers || !Array.isArray(json.triggers) || json.triggers.length === 0) {
    const pos = findPosition(doc, lc, ['triggers']);
    errors.push({
      message: 'Workflow requires at least one trigger under "triggers".',
      path: ['triggers'],
      line: pos.line,
      col: pos.col,
      severity: 'error',
      quickFix: {
        id: 'fix-workflow-triggers',
        title: 'Add manual trigger',
        description: 'Adds a default manual trigger to allow executing the workflow.',
        action: 'set_field',
        targetPath: ['triggers'],
        value: [{ type: 'manual' }]
      }
    });
  } else {
    json.triggers.forEach((tr: any, tIdx: number) => {
      const trPath = ['triggers', tIdx];
      if (!tr?.type) {
        const pos = findPosition(doc, lc, trPath);
        errors.push({
          message: `Trigger #${tIdx + 1} expects "type" (e.g. manual, scheduled, alert).`,
          path: trPath,
          line: pos.line,
          col: pos.col,
          severity: 'error',
          quickFix: {
            id: `fix-trigger-${tIdx}-type`,
            title: 'Set trigger type: "manual"',
            description: 'Configures this trigger as manual invocation.',
            action: 'set_field',
            targetPath: [...trPath, 'type'],
            value: 'manual'
          }
        });
      } else {
        const triggerDef = catalog.triggerTypes[tr.type];
        if (triggerDef) {
          for (const req of triggerDef.required) {
            if (tr[req] === undefined) {
              const pos = findPosition(doc, lc, trPath);
              errors.push({
                message: `Trigger "${tr.type}" requires "${req}".`,
                path: [...trPath, req],
                line: pos.line,
                col: pos.col,
                severity: 'error'
              });
            }
          }
          if (triggerDef.withRequired && triggerDef.withRequired.length > 0) {
            if (!tr.with) {
              const pos = findPosition(doc, lc, trPath);
              const defaultWith: Record<string, any> = {};
              if (tr.type === 'scheduled') defaultWith.every = '1h';
              errors.push({
                message: `Trigger "${tr.type}" requires "with" configuration.`,
                path: [...trPath, 'with'],
                line: pos.line,
                col: pos.col,
                severity: 'error',
                quickFix: {
                  id: `fix-trigger-${tIdx}-with`,
                  title: `Initialize trigger "with" config`,
                  description: `Adds required schedule configuration.`,
                  action: 'set_field',
                  targetPath: [...trPath, 'with'],
                  value: defaultWith
                }
              });
            }
          }
        }
      }
    });
  }

  // 4. Steps Validation (Official Kibana 445+ Step Types Engine)
  const seenStepNames = new Set<string>();

  function validateStepList(steps: any[], pathPrefix: (string | number)[]) {
    if (!Array.isArray(steps)) return;

    steps.forEach((step: any, idx: number) => {
      const currentPath = [...pathPrefix, idx];
      const stepName = step?.name ? String(step.name).trim() : '';
      const stepType = step?.type ? String(step.type).trim() : '';

      // Name & Uniqueness Check
      if (!stepName) {
        const pos = findPosition(doc, lc, [...currentPath]);
        errors.push({
          message: 'Step name is required.',
          path: [...currentPath],
          line: pos.line,
          col: pos.col,
          severity: 'error',
          quickFix: {
            id: `fix-step-name-${idx}`,
            title: `Set step name: "step_${idx + 1}"`,
            description: 'Provides a unique identifier for this step.',
            action: 'set_field',
            targetPath: [...currentPath, 'name'],
            value: `step_${idx + 1}`
          }
        });
      } else if (seenStepNames.has(stepName)) {
        const pos = findPosition(doc, lc, [...currentPath, 'name']);
        const msg = `Duplicate step name "${stepName}". Step names must be unique.`;
        errors.push({
          message: msg,
          path: [...currentPath, 'name'],
          line: pos.line,
          col: pos.col,
          stepName,
          severity: 'error',
          quickFix: {
            id: `fix-${stepName}-rename-unique`,
            title: `Rename to "${stepName}_${idx + 1}"`,
            description: 'Makes the step name unique.',
            action: 'set_field',
            targetPath: [...currentPath, 'name'],
            value: `${stepName}_${idx + 1}`
          }
        });
        addStepError(stepName, msg);
      } else {
        seenStepNames.add(stepName);
      }

      // Step Type Check
      if (!stepType) {
        const pos = findPosition(doc, lc, [...currentPath]);
        const msg = `Step "${stepName || idx + 1}" expects a valid "type".`;
        errors.push({
          message: msg,
          path: [...currentPath],
          line: pos.line,
          col: pos.col,
          stepName,
          severity: 'error',
          quickFix: {
            id: `fix-${stepName || idx}-type`,
            title: 'Set type: "console"',
            description: 'Sets default console output step type.',
            action: 'set_field',
            targetPath: [...currentPath, 'type'],
            value: 'console'
          }
        });
        addStepError(stepName, msg);
        return;
      }

      // Look up in Official Kibana Schema Catalog
      const typeDef = catalog.stepTypes[stepType];
      if (!typeDef) {
        const pos = findPosition(doc, lc, [...currentPath, 'type']);
        const msg = `Unknown step type "${stepType}". Please check spelling.`;
        errors.push({
          message: msg,
          path: [...currentPath, 'type'],
          line: pos.line,
          col: pos.col,
          stepName,
          severity: 'warning'
        });
        addStepError(stepName, msg);
      } else {
        // A. Check required properties from Official Schema (e.g. connector-id, foreach, steps, condition, with)
        for (const req of typeDef.required) {
          if (req === 'name' || req === 'type') continue;

          if (step[req] === undefined || step[req] === null || step[req] === '') {
            const pos = findPosition(doc, lc, [...currentPath]);
            const msg = `${req} expects value (at step "${stepName}" › ${req})`;

            let quickFix: QuickFix | undefined;
            if (req === 'connector-id') {
              const placeholderId = stepType === 'slack' ? 'slack-connector-id' : `${stepType}-connector-id`;
              quickFix = {
                id: `fix-${stepName}-connector-id`,
                title: `Add connector-id: "${placeholderId}"`,
                description: `Assigns a registered connector ID required by Kibana for ${stepType} steps.`,
                action: 'set_field',
                targetPath: [...currentPath, 'connector-id'],
                value: placeholderId
              };
            } else if (req === 'foreach') {
              const inferredExpr = inferForeachExpression(allWorkflowSteps, stepName);
              quickFix = {
                id: `fix-${stepName}-foreach`,
                title: `Set foreach: "${inferredExpr}"`,
                description: `Iterates over items produced by preceding search or aggregation step.`,
                action: 'set_field',
                targetPath: [...currentPath, 'foreach'],
                value: inferredExpr
              };
            } else if (req === 'steps') {
              const defaultSteps = stepType === 'foreach'
                ? [{ name: 'log_item', type: 'console', with: { message: 'Processing: {{ foreach.item }}' } }]
                : [{ name: 'action_step', type: 'console', with: { message: 'Condition matched' } }];
              quickFix = {
                id: `fix-${stepName}-steps`,
                title: `Add default step to "${stepName}"`,
                description: `Initializes the required child steps list.`,
                action: 'set_field',
                targetPath: [...currentPath, 'steps'],
                value: defaultSteps
              };
            } else if (req === 'condition') {
              quickFix = {
                id: `fix-${stepName}-condition`,
                title: 'Set condition: "true"',
                description: 'Adds a default condition expression for control flow.',
                action: 'set_field',
                targetPath: [...currentPath, 'condition'],
                value: 'true'
              };
            } else if (req === 'with') {
              const defaultWith: Record<string, any> = {};
              for (const w of (typeDef.withRequired || [])) {
                defaultWith[w] = getDefaultWithVal(w);
              }
              quickFix = {
                id: `fix-${stepName}-with`,
                title: `Initialize "with" configuration`,
                description: `Sets up parameters required by Kibana for ${stepType}.`,
                action: 'set_field',
                targetPath: [...currentPath, 'with'],
                value: defaultWith
              };
            }

            errors.push({
              message: msg,
              path: [...currentPath, req],
              line: pos.line,
              col: pos.col,
              stepName,
              severity: 'error',
              quickFix
            });
            addStepError(stepName, msg);
          }
        }

        // B. Check withRequired fields (e.g. index on create/delete, message on console/slack, etc.)
        if (typeDef.withRequired && typeDef.withRequired.length > 0) {
          if (!step.with) {
            const pos = findPosition(doc, lc, [...currentPath]);
            const msg = `Missing required "with" configuration (required: ${typeDef.withRequired.join(', ')}) (at step "${stepName}")`;
            const defaultWith: Record<string, any> = {};
            for (const w of typeDef.withRequired) {
              defaultWith[w] = getDefaultWithVal(w);
            }
            errors.push({
              message: msg,
              path: [...currentPath, 'with'],
              line: pos.line,
              col: pos.col,
              stepName,
              severity: 'error',
              quickFix: {
                id: `fix-${stepName}-with-req`,
                title: `Initialize "with" configuration`,
                description: `Fills required parameters: ${typeDef.withRequired.join(', ')}`,
                action: 'set_field',
                targetPath: [...currentPath, 'with'],
                value: defaultWith
              }
            });
            addStepError(stepName, msg);
          } else {
            for (const wReq of typeDef.withRequired) {
              if (step.with[wReq] === undefined || step.with[wReq] === null || step.with[wReq] === '') {
                const pos = findPosition(doc, lc, [...currentPath, 'with']);
                const msg = `Missing required parameter "${wReq}" (at step "${stepName}" › with.${wReq})`;
                const defaultVal = getDefaultWithVal(wReq);
                errors.push({
                  message: msg,
                  path: [...currentPath, 'with', wReq],
                  line: pos.line,
                  col: pos.col,
                  stepName,
                  severity: 'error',
                  quickFix: {
                    id: `fix-${stepName}-with-${wReq}`,
                    title: `Set with.${wReq}: "${defaultVal}"`,
                    description: `Fills missing required parameter '${wReq}'.`,
                    action: 'set_field',
                    targetPath: [...currentPath, 'with', wReq],
                    value: defaultVal
                  }
                });
                addStepError(stepName, msg);
              }
            }
          }
        }

        // C. Check unexpected properties (typo detection)
        if (typeDef.props && typeDef.props.length > 0) {
          const allowedSet = new Set(typeDef.props);
          for (const key of Object.keys(step)) {
            if (!allowedSet.has(key)) {
              const pos = findPosition(doc, lc, [...currentPath, key]);
              const closest = findClosestMatch(key, typeDef.props);
              let quickFix: QuickFix | undefined;
              let msg = `Unexpected property "${key}" (at step "${stepName}"). Not recognized by Kibana for step type "${stepType}".`;

              if (closest && levenshteinDistance(key.toLowerCase(), closest.toLowerCase()) <= 2) {
                msg = `Unexpected property "${key}" (at step "${stepName}"). Did you mean "${closest}"?`;
                quickFix = {
                  id: `fix-${stepName}-typo-${key}`,
                  title: `Rename "${key}" to "${closest}"`,
                  description: `Fixes typo to match Kibana schema.`,
                  action: 'rename_field',
                  targetPath: [...currentPath, key],
                  oldKey: key,
                  newKey: closest,
                  value: step[key]
                };
              }

              errors.push({
                message: msg,
                path: [...currentPath, key],
                line: pos.line,
                col: pos.col,
                stepName,
                severity: 'warning',
                quickFix
              });
              addStepError(stepName, msg);
            }
          }
        }
      }

      // D. Recursive Control Flow & Steps Validation
      if (step.steps !== undefined) {
        if (!Array.isArray(step.steps) || step.steps.length === 0) {
          const pos = findPosition(doc, lc, [...currentPath]);
          const msg = `steps expects a list of steps (at step "${stepName}" › steps)`;
          const defaultSteps = stepType === 'foreach'
            ? [{ name: 'log_item', type: 'console', with: { message: 'Item: {{ foreach.item }}' } }]
            : [{ name: 'action_step', type: 'console', with: { message: 'Condition matched' } }];
          errors.push({
            message: msg,
            path: [...currentPath, 'steps'],
            line: pos.line,
            col: pos.col,
            stepName,
            severity: 'error',
            quickFix: {
              id: `fix-${stepName}-empty-steps`,
              title: `Add default step to "${stepName}"`,
              description: `Loop and condition blocks require at least one step in 'steps'.`,
              action: 'set_field',
              targetPath: [...currentPath, 'steps'],
              value: defaultSteps
            }
          });
          addStepError(stepName, msg);
        } else {
          validateStepList(step.steps, [...currentPath, 'steps']);
        }
      }

      if (step.else !== undefined) {
        if (!Array.isArray(step.else) || step.else.length === 0) {
          const pos = findPosition(doc, lc, [...currentPath, 'else']);
          const msg = `else expects a list of steps (at step "${stepName}" › else)`;
          errors.push({
            message: msg,
            path: [...currentPath, 'else'],
            line: pos.line,
            col: pos.col,
            stepName,
            severity: 'error',
            quickFix: {
              id: `fix-${stepName}-empty-else`,
              title: `Add fallback step to else`,
              description: `Adds a fallback console step to the else branch.`,
              action: 'set_field',
              targetPath: [...currentPath, 'else'],
              value: [{ name: 'fallback_step', type: 'console', with: { message: 'Else branch executed' } }]
            }
          });
          addStepError(stepName, msg);
        } else {
          validateStepList(step.else, [...currentPath, 'else']);
        }
      }

      // E. Deep Query DSL Checks (e.g. Elasticsearch search term queries)
      if (stepType === 'elasticsearch.search' && step.with?.query?.term) {
        for (const [field, val] of Object.entries(step.with.query.term)) {
          if (typeof val === 'boolean' || typeof val === 'number') {
            const pos = findPosition(doc, lc, [...currentPath, 'with', 'query', 'term', field]);
            const msg = `${field} must be one of: - a string - { value: ... } object (at step "${stepName}" › with.query.term.${field})`;
            errors.push({
              message: msg,
              path: [...currentPath, 'with', 'query', 'term', field],
              line: pos.line,
              col: pos.col,
              stepName,
              severity: 'error',
              quickFix: {
                id: `fix-${stepName}-term-${field}`,
                title: `Wrap "${field}: ${val}" in { value: ${val} }`,
                description: `Kibana Workflows require boolean/number term filters to be structured as { value: ${val} }.`,
                action: 'fix_term_query',
                targetPath: [...currentPath, 'with', 'query', 'term', field],
                value: val
              }
            });
            addStepError(stepName, msg);
          }
        }
      }
    });
  }

  if (Array.isArray(json.steps)) {
    if (json.steps.length === 0) {
      const pos = findPosition(doc, lc, ['steps']);
      errors.push({
        message: 'Workflow requires at least one step in "steps".',
        path: ['steps'],
        line: pos.line,
        col: pos.col,
        severity: 'error',
        quickFix: {
          id: 'fix-workflow-steps',
          title: 'Add initial console step',
          description: 'Adds a starting console step.',
          action: 'set_field',
          targetPath: ['steps'],
          value: [{ name: 'log_start', type: 'console', with: { message: 'Workflow started' } }]
        }
      });
    } else {
      validateStepList(json.steps, ['steps']);
    }
  } else {
    const pos = findPosition(doc, lc, ['steps']);
    errors.push({
      message: 'Workflow "steps" must be a list.',
      path: ['steps'],
      line: pos.line,
      col: pos.col,
      severity: 'error',
      quickFix: {
        id: 'fix-workflow-steps-list',
        title: 'Initialize "steps" list',
        description: 'Creates an empty steps list with a sample action.',
        action: 'set_field',
        targetPath: ['steps'],
        value: [{ name: 'log_start', type: 'console', with: { message: 'Workflow started' } }]
      }
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    errorsByStep
  };
}

/**
 * Applies a single quick fix surgically to the YAML document, preserving formatting, whitespace, and comments.
 */
export function applyQuickFix(yamlString: string, fix: QuickFix): string {
  if (!yamlString || !fix) return yamlString;
  const doc = yaml.parseDocument(yamlString, { keepSourceTokens: true });
  if (doc.errors && doc.errors.length > 0) {
    return yamlString;
  }

  try {
    if (fix.action === 'rename_field' && fix.newKey) {
      const val = doc.getIn(fix.targetPath);
      doc.deleteIn(fix.targetPath);
      const parentPath = fix.targetPath.slice(0, -1);
      doc.setIn([...parentPath, fix.newKey], val !== undefined ? val : fix.value);
    } else if (fix.action === 'fix_term_query') {
      doc.setIn(fix.targetPath, { value: fix.value });
    } else {
      doc.setIn(fix.targetPath, fix.value);
    }
    return doc.toString();
  } catch (err) {
    console.error('Failed to apply quick fix:', fix, err);
    return yamlString;
  }
}

/**
 * Applies multiple quick fixes atomically to the YAML document.
 */
export function applyAllQuickFixes(yamlString: string, fixes: QuickFix[]): string {
  if (!yamlString || !fixes || fixes.length === 0) return yamlString;
  const doc = yaml.parseDocument(yamlString, { keepSourceTokens: true });
  if (doc.errors && doc.errors.length > 0) return yamlString;

  for (const fix of fixes) {
    try {
      if (fix.action === 'rename_field' && fix.newKey) {
        const val = doc.getIn(fix.targetPath);
        doc.deleteIn(fix.targetPath);
        const parentPath = fix.targetPath.slice(0, -1);
        doc.setIn([...parentPath, fix.newKey], val !== undefined ? val : fix.value);
      } else if (fix.action === 'fix_term_query') {
        doc.setIn(fix.targetPath, { value: fix.value });
      } else {
        doc.setIn(fix.targetPath, fix.value);
      }
    } catch (err) {
      console.warn('Failed to apply quick fix:', fix, err);
    }
  }

  return doc.toString();
}
