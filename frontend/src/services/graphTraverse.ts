import { CustomNode } from '../types.js';
import { Edge } from '@xyflow/react';

export interface VariableItem {
  label: string;
  expression: string;
  category: 'step' | 'trigger' | 'loop' | 'system';
  sourceName?: string;
  sourceType?: string;
  description?: string;
  dataType?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
}

/**
 * Traverses backwards from the given currentNodeId along incoming edges
 * to collect all preceding nodes in topological order.
 */
export function getUpstreamNodes(
  currentNodeId: string,
  nodes: CustomNode[],
  edges: Edge[]
): CustomNode[] {
  const nodeMap = new Map<string, CustomNode>(nodes.map(n => [n.id, n]));
  const incomingEdgesMap = new Map<string, string[]>();

  // Build map of incoming edges: target -> sources
  for (const edge of edges) {
    const list = incomingEdgesMap.get(edge.target) || [];
    list.push(edge.source);
    incomingEdgesMap.set(edge.target, list);
  }

  const visited = new Set<string>();
  const upstreamNodes: CustomNode[] = [];

  const queue: string[] = [...(incomingEdgesMap.get(currentNodeId) || [])];

  // Also check if current node is a nested node (e.g. parentId prefix)
  for (const node of nodes) {
    if (
      currentNodeId.startsWith(`${node.id}-then-`) ||
      currentNodeId.startsWith(`${node.id}-else-`) ||
      currentNodeId.startsWith(`${node.id}-loop-`)
    ) {
      if (!queue.includes(node.id)) {
        queue.push(node.id);
      }
    }
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (node) {
      upstreamNodes.push(node);
      const predecessors = incomingEdgesMap.get(currentId) || [];
      for (const pred of predecessors) {
        if (!visited.has(pred)) {
          queue.push(pred);
        }
      }

      // Check if this predecessor is also nested inside another node
      for (const candidateParent of nodes) {
        if (
          currentId.startsWith(`${candidateParent.id}-then-`) ||
          currentId.startsWith(`${candidateParent.id}-else-`) ||
          currentId.startsWith(`${candidateParent.id}-loop-`)
        ) {
          if (!visited.has(candidateParent.id)) {
            queue.push(candidateParent.id);
          }
        }
      }
    }
  }

  return upstreamNodes;
}

/**
 * Computes all available Liquid variables accessible to the current node.
 * Inspects upstream steps, active triggers, and loop context.
 */
export function getAvailableVariables(
  currentNodeId: string,
  nodes: CustomNode[],
  edges: Edge[]
): VariableItem[] {
  const upstreamNodes = getUpstreamNodes(currentNodeId, nodes, edges);
  const variables: VariableItem[] = [];

  // 1. Loop Context (if inside foreach)
  const isInsideLoop =
    currentNodeId.includes('-loop-') ||
    upstreamNodes.some(n => n.data.type === 'foreach');

  if (isInsideLoop) {
    variables.push({
      label: 'foreach.item',
      expression: '{{ foreach.item }}',
      category: 'loop',
      description: 'Current item in the foreach loop iteration',
      dataType: 'any'
    });
    variables.push({
      label: 'foreach.index',
      expression: '{{ foreach.index }}',
      category: 'loop',
      description: 'Zero-based index of current iteration',
      dataType: 'number'
    });
  }

  // 2. Upstream Step Variables
  for (const node of upstreamNodes) {
    if (node.data.nodeCategory === 'trigger') continue;

    const stepName = node.data.name;
    const stepType = node.data.type || '';

    // Standard output base
    variables.push({
      label: `steps.${stepName}.output`,
      expression: `{{ steps.${stepName}.output }}`,
      category: 'step',
      sourceName: stepName,
      sourceType: stepType,
      description: `Full execution output of step "${stepName}"`,
      dataType: 'object'
    });

    // Type-specific field helpers
    if (stepType === 'elasticsearch.search') {
      variables.push({
        label: `steps.${stepName}.output.hits.hits`,
        expression: `{{ steps.${stepName}.output.hits.hits }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Array of search matching documents',
        dataType: 'array'
      });
      variables.push({
        label: `steps.${stepName}.output.hits.total.value`,
        expression: `{{ steps.${stepName}.output.hits.total.value }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Total number of documents matching query',
        dataType: 'number'
      });
      variables.push({
        label: `steps.${stepName}.output.hits.hits[0]._source`,
        expression: `{{ steps.${stepName}.output.hits.hits[0]._source }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Source body of the first matching hit',
        dataType: 'object'
      });
      variables.push({
        label: `steps.${stepName}.output.aggregations`,
        expression: `{{ steps.${stepName}.output.aggregations }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Aggregation buckets and statistical metrics',
        dataType: 'object'
      });
    } else if (stepType === 'elasticsearch.esql.query') {
      variables.push({
        label: `steps.${stepName}.output.values`,
        expression: `{{ steps.${stepName}.output.values }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Array of row values returned by ES|QL',
        dataType: 'array'
      });
      variables.push({
        label: `steps.${stepName}.output.columns`,
        expression: `{{ steps.${stepName}.output.columns }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Column definitions returned by ES|QL',
        dataType: 'array'
      });
    } else if (stepType === 'elasticsearch.index' || stepType === 'elasticsearch.update') {
      variables.push({
        label: `steps.${stepName}.output._id`,
        expression: `{{ steps.${stepName}.output._id }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Document ID created or updated in Elasticsearch',
        dataType: 'string'
      });
      variables.push({
        label: `steps.${stepName}.output.result`,
        expression: `{{ steps.${stepName}.output.result }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Result status (e.g. "created", "updated")',
        dataType: 'string'
      });
    } else if (stepType === 'http' || stepType === 'http.request') {
      variables.push({
        label: `steps.${stepName}.output.body`,
        expression: `{{ steps.${stepName}.output.body }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Decoded response body (JSON object or string)',
        dataType: 'any'
      });
      variables.push({
        label: `steps.${stepName}.output.status`,
        expression: `{{ steps.${stepName}.output.status }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'HTTP status code (e.g. 200, 404, 500)',
        dataType: 'number'
      });
      variables.push({
        label: `steps.${stepName}.output.headers`,
        expression: `{{ steps.${stepName}.output.headers }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'HTTP response header map',
        dataType: 'object'
      });
    } else if (stepType.startsWith('ai.')) {
      variables.push({
        label: `steps.${stepName}.output.response`,
        expression: `{{ steps.${stepName}.output.response }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'AI model generated completion text',
        dataType: 'string'
      });
    } else if (stepType === 'slack' || stepType.startsWith('slack.')) {
      variables.push({
        label: `steps.${stepName}.output.ts`,
        expression: `{{ steps.${stepName}.output.ts }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Slack message timestamp identifier',
        dataType: 'string'
      });
      variables.push({
        label: `steps.${stepName}.output.channel`,
        expression: `{{ steps.${stepName}.output.channel }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Slack channel ID where message was posted',
        dataType: 'string'
      });
    } else if (stepType === 'jira' || stepType.startsWith('jira.')) {
      variables.push({
        label: `steps.${stepName}.output.key`,
        expression: `{{ steps.${stepName}.output.key }}`,
        category: 'step',
        sourceName: stepName,
        sourceType: stepType,
        description: 'Created Jira issue key (e.g. "SEC-1042")',
        dataType: 'string'
      });
    }
  }

  // 3. Trigger / Event Variables
  const hasTrigger = nodes.some(n => n.data.nodeCategory === 'trigger');
  if (hasTrigger) {
    variables.push({
      label: 'event.alerts',
      expression: '{{ event.alerts }}',
      category: 'trigger',
      description: 'Array of alert documents triggering the workflow',
      dataType: 'array'
    });
    variables.push({
      label: 'event.alerts[0].kibana.alert.risk_score',
      expression: '{{ event.alerts[0].kibana.alert.risk_score }}',
      category: 'trigger',
      description: 'Risk score of the primary alert (0 - 100)',
      dataType: 'number'
    });
    variables.push({
      label: 'event.alerts[0].kibana.alert.rule.name',
      expression: '{{ event.alerts[0].kibana.alert.rule.name }}',
      category: 'trigger',
      description: 'Name of the detection rule that created the alert',
      dataType: 'string'
    });
    variables.push({
      label: 'event.alerts[0]._source',
      expression: '{{ event.alerts[0]._source }}',
      category: 'trigger',
      description: 'Raw source document of the primary alert',
      dataType: 'object'
    });
    variables.push({
      label: 'event.action',
      expression: '{{ event.action }}',
      category: 'trigger',
      description: 'Trigger action name or episode lifecycle type',
      dataType: 'string'
    });
  }

  return variables;
}
