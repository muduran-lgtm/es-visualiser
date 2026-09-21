import { describe, it, expect } from 'vitest';
import { getUpstreamNodes, getAvailableVariables } from './graphTraverse.js';
import { CustomNode } from '../types.js';
import { Edge } from '@xyflow/react';

describe('graphTraverse service', () => {
  const sampleNodes: CustomNode[] = [
    {
      id: 'trigger-1',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        id: 'trigger-1',
        nodeCategory: 'trigger',
        name: 'manual_trigger',
        type: 'alert'
      }
    },
    {
      id: 'step-search',
      type: 'custom',
      position: { x: 0, y: 100 },
      data: {
        id: 'step-search',
        nodeCategory: 'step',
        name: 'search_logs',
        type: 'elasticsearch.search',
        with: { index: 'logs-*', size: 10 }
      }
    },
    {
      id: 'step-http',
      type: 'custom',
      position: { x: 0, y: 200 },
      data: {
        id: 'step-http',
        nodeCategory: 'step',
        name: 'notify_webhook',
        type: 'http',
        with: { url: 'https://api.example.com/alerts' }
      }
    },
    {
      id: 'step-console',
      type: 'custom',
      position: { x: 0, y: 300 },
      data: {
        id: 'step-console',
        nodeCategory: 'step',
        name: 'final_log',
        type: 'console',
        with: { message: 'Done' }
      }
    }
  ];

  const sampleEdges: Edge[] = [
    { id: 'e1', source: 'trigger-1', target: 'step-search' },
    { id: 'e2', source: 'step-search', target: 'step-http' },
    { id: 'e3', source: 'step-http', target: 'step-console' }
  ];

  it('correctly discovers all upstream nodes backwards from target node', () => {
    const upstreamFromConsole = getUpstreamNodes('step-console', sampleNodes, sampleEdges);
    const upstreamIds = upstreamFromConsole.map(n => n.id);

    expect(upstreamIds).toContain('step-http');
    expect(upstreamIds).toContain('step-search');
    expect(upstreamIds).toContain('trigger-1');
    expect(upstreamIds).not.toContain('step-console');
  });

  it('generates rich variable suggestions based on upstream step types and trigger', () => {
    const variables = getAvailableVariables('step-console', sampleNodes, sampleEdges);

    // Check Elasticsearch search suggestions
    const esHitsVar = variables.find(v => v.expression === '{{ steps.search_logs.output.hits.hits }}');
    expect(esHitsVar).toBeDefined();
    expect(esHitsVar?.sourceType).toBe('elasticsearch.search');

    const esTotalVar = variables.find(v => v.expression === '{{ steps.search_logs.output.hits.total.value }}');
    expect(esTotalVar).toBeDefined();

    // Check HTTP suggestions
    const httpBodyVar = variables.find(v => v.expression === '{{ steps.notify_webhook.output.body }}');
    expect(httpBodyVar).toBeDefined();
    expect(httpBodyVar?.sourceType).toBe('http');

    const httpStatusVar = variables.find(v => v.expression === '{{ steps.notify_webhook.output.status }}');
    expect(httpStatusVar).toBeDefined();

    // Check Trigger suggestions
    const triggerRiskVar = variables.find(v => v.expression === '{{ event.alerts[0].kibana.alert.risk_score }}');
    expect(triggerRiskVar).toBeDefined();
    expect(triggerRiskVar?.category).toBe('trigger');
  });

  it('includes loop variables when inside or downstream of a foreach step', () => {
    const loopNodes: CustomNode[] = [
      ...sampleNodes,
      {
        id: 'step-loop-body',
        type: 'custom',
        position: { x: 50, y: 250 },
        data: {
          id: 'step-loop-body',
          nodeCategory: 'step',
          name: 'process_item',
          type: 'console'
        }
      }
    ];

    const loopEdges: Edge[] = [
      ...sampleEdges,
      { id: 'e-loop', source: 'step-http', target: 'step-loop-body' }
    ];

    // Mark step-http as foreach
    loopNodes[2].data.type = 'foreach';
    loopNodes[2].data.name = 'loop_items';

    const loopVars = getAvailableVariables('step-loop-body', loopNodes, loopEdges);
    const itemVar = loopVars.find(v => v.expression === '{{ foreach.item }}');
    const indexVar = loopVars.find(v => v.expression === '{{ foreach.index }}');

    expect(itemVar).toBeDefined();
    expect(indexVar).toBeDefined();
  });
});
