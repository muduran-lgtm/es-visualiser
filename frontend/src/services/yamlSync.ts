import yaml from 'yaml';
import { Node, Edge } from '@xyflow/react';
import { WorkflowNodeData, CustomNode } from '../types.js';

export interface ParseResult {
  nodes: CustomNode[];
  edges: Edge[];
  error?: string;
  warnings?: string[];
  workflowName?: string;
  workflowEnabled?: boolean;
}

const KNOWN_STEP_TYPES = new Set([
  'console',
  'elasticsearch.search',
  'elasticsearch.index',
  'elasticsearch.update',
  'elasticsearch.delete',
  'elasticsearch.esql',
  'elasticsearch.esql.query',
  'elasticsearch.request',
  'elasticsearch.indices.create',
  'kibana.SetAlertsStatus',
  'kibana.SetAlertTags',
  'kibana.request',
  'http.request',
  'ai.prompt',
  'ai.classify',
  'ai.summarize',
  'ai.agent',
  'if',
  'foreach',
  'switch',
  'wait'
]);

/**
 * YAML içeriğini React Flow düğümlerine ve kenarlarına dönüştürür.
 * eemeli/yaml Document API'si kullanılır.
 */
export function yamlToGraph(yamlString: string): ParseResult {
  if (!yamlString || !yamlString.trim()) {
    return { nodes: [], edges: [], warnings: [] };
  }

  let doc: yaml.Document;
  try {
    doc = yaml.parseDocument(yamlString, { keepSourceTokens: true });
  } catch (err: any) {
    return { nodes: [], edges: [], error: `YAML parse error: ${err.message}` };
  }

  if (doc.errors && doc.errors.length > 0) {
    return {
      nodes: [],
      edges: [],
      error: doc.errors.map(e => `Line ${e.linePos?.[0]?.line || '?'}: ${e.message}`).join('\n')
    };
  }

  const json = doc.toJSON() || {};
  const nodes: CustomNode[] = [];
  const edges: Edge[] = [];
  const warnings: string[] = [];
  const seenStepNames = new Set<string>();

  const workflowName = json.name || 'Untitled Workflow';
  const workflowEnabled = json.enabled !== false;

  // 1. Triggers Nodes
  const triggers = Array.isArray(json.triggers) ? json.triggers : [];
  triggers.forEach((tr: any, idx: number) => {
    const triggerId = `trigger-${idx}`;
    const triggerType = tr?.type || 'manual';
    nodes.push({
      id: triggerId,
      type: 'triggerNode',
      position: { x: 0, y: 0 },
      data: {
        id: triggerId,
        nodeCategory: 'trigger',
        name: `Trigger: ${triggerType}`,
        type: triggerType,
        with: tr?.with || {},
        inputs: tr?.inputs
      }
    });
  });

  // Helper: Create step node
  function createStepNode(step: any, fallbackIndex: number, parentPrefix = ''): CustomNode {
    const rawName = step?.name ? String(step.name).trim() : `step_${fallbackIndex}`;
    const stepType = step?.type ? String(step.type).trim() : 'console';
    const uniqueId = parentPrefix ? `${parentPrefix}-${rawName}` : rawName;

    // Uniqueness check
    if (seenStepNames.has(rawName)) {
      warnings.push(`Step name "${rawName}" is used multiple times! Names must be unique.`);
    } else {
      seenStepNames.add(rawName);
    }

    let validationError: string | undefined;
    if (!step?.name) {
      validationError = 'Step name is required.';
    }

    const isKnown = KNOWN_STEP_TYPES.has(stepType);
    let nodeCategory: 'step' | 'flow-control' | 'generic' = 'step';
    let reactFlowType = 'stepNode';

    if (stepType === 'if') {
      nodeCategory = 'flow-control';
      reactFlowType = 'ifNode';
    } else if (stepType === 'foreach') {
      nodeCategory = 'flow-control';
      reactFlowType = 'foreachNode';
    } else if (!isKnown) {
      nodeCategory = 'generic';
      reactFlowType = 'genericNode';
    }

    return {
      id: uniqueId,
      type: reactFlowType,
      position: { x: 0, y: 0 },
      data: {
        id: uniqueId,
        nodeCategory,
        name: rawName,
        type: stepType,
        description: step?.description,
        with: step?.with ? { ...step.with } : {},
        condition: step?.condition,
        foreach: step?.foreach,
        rawStep: step,
        validationError
      }
    };
  }

  // 2. Ana Steps Düğümleri ve Bağlantıları
  const steps = Array.isArray(json.steps) ? json.steps : [];
  let previousMainStepId: string | null = null;

  steps.forEach((step: any, idx: number) => {
    const stepNode = createStepNode(step, idx + 1);
    nodes.push(stepNode);

    // İlk adımı tüm tetikleyicilere bağla
    if (idx === 0) {
      triggers.forEach((_tr: any, tIdx: number) => {
        edges.push({
          id: `edge-trigger-${tIdx}-${stepNode.id}`,
          source: `trigger-${tIdx}`,
          target: stepNode.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#00bfb3', strokeWidth: 2 }
        });
      });
    }

    // Ana adımlar arası doğrusal bağlantı
    if (previousMainStepId) {
      edges.push({
        id: `edge-${previousMainStepId}-${stepNode.id}`,
        source: previousMainStepId,
        target: stepNode.id,
        type: 'smoothstep',
        style: { stroke: '#69707d', strokeWidth: 2 }
      });
    }
    previousMainStepId = stepNode.id;

    // İç İçe Dallanmalar: if (then / else)
    if (step.type === 'if') {
      // Then dallanması
      if (Array.isArray(step.steps) && step.steps.length > 0) {
        let prevThenId = stepNode.id;
        step.steps.forEach((subStep: any, sIdx: number) => {
          const subNode = createStepNode(subStep, sIdx + 1, `${stepNode.id}-then`);
          nodes.push(subNode);
          edges.push({
            id: `edge-${prevThenId}-${subNode.id}`,
            source: prevThenId,
            target: subNode.id,
            label: prevThenId === stepNode.id ? 'Then' : undefined,
            type: 'smoothstep',
            style: { stroke: '#00bfb3', strokeWidth: 2, strokeDasharray: '4 2' }
          });
          prevThenId = subNode.id;
        });
      }

      // Else dallanması
      if (Array.isArray(step.else) && step.else.length > 0) {
        let prevElseId = stepNode.id;
        step.else.forEach((subStep: any, sIdx: number) => {
          const subNode = createStepNode(subStep, sIdx + 1, `${stepNode.id}-else`);
          nodes.push(subNode);
          edges.push({
            id: `edge-${prevElseId}-${subNode.id}`,
            source: prevElseId,
            target: subNode.id,
            label: prevElseId === stepNode.id ? 'Else' : undefined,
            type: 'smoothstep',
            style: { stroke: '#f04e98', strokeWidth: 2, strokeDasharray: '4 2' }
          });
          prevElseId = subNode.id;
        });
      }
    }

    // İç İçe Dallanmalar: foreach
    if (step.type === 'foreach') {
      if (Array.isArray(step.steps) && step.steps.length > 0) {
        let prevLoopId = stepNode.id;
        step.steps.forEach((subStep: any, sIdx: number) => {
          const subNode = createStepNode(subStep, sIdx + 1, `${stepNode.id}-loop`);
          nodes.push(subNode);
          edges.push({
            id: `edge-${prevLoopId}-${subNode.id}`,
            source: prevLoopId,
            target: subNode.id,
            label: prevLoopId === stepNode.id ? 'Each item' : undefined,
            type: 'smoothstep',
            style: { stroke: '#3274d9', strokeWidth: 2, strokeDasharray: '4 2' }
          });
          prevLoopId = subNode.id;
        });
      }
    }
  });

  return {
    nodes,
    edges,
    warnings,
    workflowName,
    workflowEnabled
  };
}

/**
 * Graf düğümlerindeki değişiklikleri orijinal YAML yapısını bozmadan geri yazar.
 * Tanınmayan alanları, açıklamaları ve üst seviye anahtarları eksiksiz korur.
 */
export function graphToYaml(
  originalYaml: string,
  nodes: CustomNode[],
  extraMetadata?: { name?: string; enabled?: boolean; description?: string }
): string {
  let doc: yaml.Document;
  try {
    doc = yaml.parseDocument(originalYaml || '', { keepSourceTokens: true });
  } catch {
    doc = new yaml.Document();
  }

  // Üst düzey meta alanları güncelle
  if (extraMetadata?.name !== undefined) {
    doc.set('name', extraMetadata.name);
  }
  if (extraMetadata?.enabled !== undefined) {
    doc.set('enabled', extraMetadata.enabled);
  }
  if (extraMetadata?.description !== undefined) {
    doc.set('description', extraMetadata.description);
  }

  // 1. Triggers güncelleme
  const triggerNodes = nodes.filter(n => n.data.nodeCategory === 'trigger');
  if (triggerNodes.length > 0) {
    const triggersYamlList = triggerNodes.map(tn => {
      const item: Record<string, any> = { type: tn.data.type || 'manual' };
      if (tn.data.with && Object.keys(tn.data.with).length > 0) {
        item.with = tn.data.with;
      }
      if (tn.data.inputs) {
        item.inputs = tn.data.inputs;
      }
      return item;
    });
    doc.set('triggers', triggersYamlList);
  }

  // 2. Steps güncelleme
  // Sadece ana seviye step düğümlerini topla (iç içe olanlar parent prefix içerir)
  const mainStepNodes = nodes.filter(
    n => n.data.nodeCategory !== 'trigger' && !n.id.includes('-then-') && !n.id.includes('-else-') && !n.id.includes('-loop-')
  );

  const stepsYamlList = mainStepNodes.map(sn => {
    const data = sn.data;

    // Eğer bilinmeyen generic bir step ise ve orijinal alanları saklanmışsa koru
    const base: Record<string, any> = data.rawStep ? { ...data.rawStep } : {};
    base.name = data.name;
    base.type = data.type;

    if (data.description) base.description = data.description;
    if (data.with && Object.keys(data.with).length > 0) {
      base.with = data.with;
    } else if (data.with && Object.keys(data.with).length === 0 && base.with) {
      delete base.with;
    }

    if (data.type === 'if') {
      if (data.condition) base.condition = data.condition;
      // then alt adımlarını topla
      const thenNodes = nodes.filter(n => n.id.startsWith(`${sn.id}-then-`));
      if (thenNodes.length > 0) {
        base.steps = thenNodes.map(tn => {
          const subBase: Record<string, any> = tn.data.rawStep ? { ...tn.data.rawStep } : {};
          subBase.name = tn.data.name;
          subBase.type = tn.data.type;
          if (tn.data.description) subBase.description = tn.data.description;
          if (tn.data.condition) subBase.condition = tn.data.condition;
          if (tn.data.with && Object.keys(tn.data.with).length > 0) {
            subBase.with = tn.data.with;
          } else if (tn.data.with && Object.keys(tn.data.with).length === 0 && subBase.with) {
            delete subBase.with;
          }
          return subBase;
        });
      }
      // else alt adımlarını topla
      const elseNodes = nodes.filter(n => n.id.startsWith(`${sn.id}-else-`));
      if (elseNodes.length > 0) {
        base.else = elseNodes.map(en => {
          const subBase: Record<string, any> = en.data.rawStep ? { ...en.data.rawStep } : {};
          subBase.name = en.data.name;
          subBase.type = en.data.type;
          if (en.data.description) subBase.description = en.data.description;
          if (en.data.condition) subBase.condition = en.data.condition;
          if (en.data.with && Object.keys(en.data.with).length > 0) {
            subBase.with = en.data.with;
          } else if (en.data.with && Object.keys(en.data.with).length === 0 && subBase.with) {
            delete subBase.with;
          }
          return subBase;
        });
      }
    } else if (data.type === 'foreach') {
      if (data.foreach) base.foreach = data.foreach;
      const loopNodes = nodes.filter(n => n.id.startsWith(`${sn.id}-loop-`));
      if (loopNodes.length > 0) {
        base.steps = loopNodes.map(ln => {
          const subBase: Record<string, any> = ln.data.rawStep ? { ...ln.data.rawStep } : {};
          subBase.name = ln.data.name;
          subBase.type = ln.data.type;
          if (ln.data.description) subBase.description = ln.data.description;
          if (ln.data.condition) subBase.condition = ln.data.condition;
          if (ln.data.with && Object.keys(ln.data.with).length > 0) {
            subBase.with = ln.data.with;
          } else if (ln.data.with && Object.keys(ln.data.with).length === 0 && subBase.with) {
            delete subBase.with;
          }
          return subBase;
        });
      }
    }

    return base;
  });

  if (stepsYamlList.length > 0) {
    doc.set('steps', stepsYamlList);
  }

  return doc.toString();
}
