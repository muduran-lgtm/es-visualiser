import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

export interface ValidationError {
  message: string;
  path?: (string | number)[];
  line: number;
  col: number;
  stepName?: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function getCatalogPath(): string {
  const p1 = path.resolve(process.cwd(), 'data/schemaCatalog.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'server/data/schemaCatalog.json');
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function loadCatalog(): { stepTypes: Record<string, any>; triggerTypes: Record<string, any> } {
  try {
    const catPath = getCatalogPath();
    if (fs.existsSync(catPath)) {
      return JSON.parse(fs.readFileSync(catPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading schemaCatalog.json:', err);
  }
  return { stepTypes: {}, triggerTypes: {} };
}

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

export function validateWorkflow(yamlContent: string): ValidationResult {
  if (!yamlContent || !yamlContent.trim()) {
    return {
      valid: false,
      errors: [{ message: 'Workflow YAML cannot be empty.', line: 1, col: 1, severity: 'error' }]
    };
  }

  const catalog = loadCatalog();
  const lc = new yaml.LineCounter();
  let doc: yaml.Document;
  try {
    doc = yaml.parseDocument(yamlContent, { lineCounter: lc, keepSourceTokens: true });
  } catch (err: any) {
    return {
      valid: false,
      errors: [{ message: `YAML parse error: ${err.message}`, line: 1, col: 1, severity: 'error' }]
    };
  }

  const errors: ValidationError[] = [];

  if (doc.errors && doc.errors.length > 0) {
    for (const e of doc.errors) {
      errors.push({
        message: `YAML Syntax Error: ${e.message}`,
        line: e.linePos ? e.linePos[0].line : 1,
        col: e.linePos ? e.linePos[0].col : 1,
        severity: 'error'
      });
    }
    return { valid: false, errors };
  }

  const json = doc.toJSON() || {};

  if (!json.name || typeof json.name !== 'string' || !json.name.trim()) {
    const pos = findPosition(doc, lc, ['name']);
    errors.push({
      message: 'Workflow "name" is required and cannot be empty.',
      path: ['name'],
      line: pos.line,
      col: pos.col,
      severity: 'error'
    });
  }

  if (!json.triggers || !Array.isArray(json.triggers) || json.triggers.length === 0) {
    const pos = findPosition(doc, lc, ['triggers']);
    errors.push({
      message: 'Workflow requires at least one trigger under "triggers".',
      path: ['triggers'],
      line: pos.line,
      col: pos.col,
      severity: 'error'
    });
  }

  const seenStepNames = new Set<string>();

  function validateStepList(steps: any[], pathPrefix: (string | number)[]) {
    if (!Array.isArray(steps)) return;

    steps.forEach((step: any, idx: number) => {
      const currentPath = [...pathPrefix, idx];
      const stepName = step?.name ? String(step.name).trim() : '';
      const stepType = step?.type ? String(step.type).trim() : '';

      if (!stepName) {
        const pos = findPosition(doc, lc, [...currentPath]);
        errors.push({
          message: 'Step name is required.',
          path: [...currentPath],
          line: pos.line,
          col: pos.col,
          severity: 'error'
        });
      } else if (seenStepNames.has(stepName)) {
        const pos = findPosition(doc, lc, [...currentPath, 'name']);
        errors.push({
          message: `Duplicate step name "${stepName}". Step names must be unique.`,
          path: [...currentPath, 'name'],
          line: pos.line,
          col: pos.col,
          stepName,
          severity: 'error'
        });
      } else {
        seenStepNames.add(stepName);
      }

      if (!stepType) {
        const pos = findPosition(doc, lc, [...currentPath]);
        errors.push({
          message: `Step "${stepName || idx + 1}" expects a valid "type".`,
          path: [...currentPath],
          line: pos.line,
          col: pos.col,
          stepName,
          severity: 'error'
        });
        return;
      }

      const typeDef = catalog.stepTypes[stepType];
      if (!typeDef) {
        const pos = findPosition(doc, lc, [...currentPath, 'type']);
        errors.push({
          message: `Unknown step type "${stepType}".`,
          path: [...currentPath, 'type'],
          line: pos.line,
          col: pos.col,
          stepName,
          severity: 'warning'
        });
      } else {
        for (const req of typeDef.required) {
          if (req === 'name' || req === 'type') continue;

          if (step[req] === undefined || step[req] === null || step[req] === '') {
            const pos = findPosition(doc, lc, [...currentPath]);
            errors.push({
              message: `${req} expects value (at step "${stepName}" › ${req})`,
              path: [...currentPath, req],
              line: pos.line,
              col: pos.col,
              stepName,
              severity: 'error'
            });
          }
        }

        if (typeDef.withRequired && typeDef.withRequired.length > 0) {
          if (!step.with) {
            const pos = findPosition(doc, lc, [...currentPath]);
            errors.push({
              message: `Missing required "with" configuration (required: ${typeDef.withRequired.join(', ')}) (at step "${stepName}")`,
              path: [...currentPath, 'with'],
              line: pos.line,
              col: pos.col,
              stepName,
              severity: 'error'
            });
          } else {
            for (const wReq of typeDef.withRequired) {
              if (step.with[wReq] === undefined || step.with[wReq] === null || step.with[wReq] === '') {
                const pos = findPosition(doc, lc, [...currentPath, 'with']);
                errors.push({
                  message: `Missing required parameter "${wReq}" (at step "${stepName}" › with.${wReq})`,
                  path: [...currentPath, 'with', wReq],
                  line: pos.line,
                  col: pos.col,
                  stepName,
                  severity: 'error'
                });
              }
            }
          }
        }
      }

      if (step.steps !== undefined) {
        if (!Array.isArray(step.steps) || step.steps.length === 0) {
          const pos = findPosition(doc, lc, [...currentPath]);
          errors.push({
            message: `steps expects a list of steps (at step "${stepName}" › steps)`,
            path: [...currentPath, 'steps'],
            line: pos.line,
            col: pos.col,
            stepName,
            severity: 'error'
          });
        } else {
          validateStepList(step.steps, [...currentPath, 'steps']);
        }
      }

      if (step.else !== undefined) {
        if (!Array.isArray(step.else) || step.else.length === 0) {
          const pos = findPosition(doc, lc, [...currentPath]);
          errors.push({
            message: `else expects a list of steps (at step "${stepName}" › else)`,
            path: [...currentPath, 'else'],
            line: pos.line,
            col: pos.col,
            stepName,
            severity: 'error'
          });
        } else {
          validateStepList(step.else, [...currentPath, 'else']);
        }
      }

      if (stepType === 'elasticsearch.search' && step.with?.query?.term) {
        for (const [field, val] of Object.entries(step.with.query.term)) {
          if (typeof val === 'boolean' || typeof val === 'number') {
            const pos = findPosition(doc, lc, [...currentPath, 'with', 'query', 'term', field]);
            errors.push({
              message: `${field} must be one of: - a string - { value: ... } object (at step "${stepName}" › with.query.term.${field})`,
              path: [...currentPath, 'with', 'query', 'term', field],
              line: pos.line,
              col: pos.col,
              stepName,
              severity: 'error'
            });
          }
        }
      }
    });
  }

  if (Array.isArray(json.steps)) {
    validateStepList(json.steps, ['steps']);
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors
  };
}
