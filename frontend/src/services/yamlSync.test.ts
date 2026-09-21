import { describe, it, expect } from 'vitest';
import { yamlToGraph, graphToYaml } from './yamlSync.js';

describe('yamlSync: Round-trip and lossless transformation', () => {
  it('converts YAML to Graph nodes and edges correctly', () => {
    const sampleYaml = `
name: Test Workflow
description: Sample description
enabled: true
triggers:
  - type: manual
steps:
  - name: step_one
    type: console
    with:
      message: "Hello"
  - name: step_two
    type: elasticsearch.search
    with:
      index: "logs-*"
`;
    const result = yamlToGraph(sampleYaml);
    expect(result.error).toBeUndefined();
    expect(result.nodes.length).toBe(3); // 1 trigger + 2 steps
    expect(result.edges.length).toBe(2); // trigger -> step_one, step_one -> step_two
    expect(result.workflowName).toBe('Test Workflow');
  });

  it('preserves unknown fields, comments, and custom metadata on round-trip', () => {
    const yamlWithUnknowns = `# Custom header comment
name: Unchanged Workflow
# Constants block must be preserved
consts:
  custom_threshold: 99
  internal_token: "secret"
triggers:
  - type: manual
steps:
  - name: known_step
    type: console
    with:
      message: "ok"
  - name: unknown_custom_step
    type: custom.internal.action
    custom_attribute: "value must be preserved"
    with:
      foo: bar
`;
    const parseRes = yamlToGraph(yamlWithUnknowns);
    expect(parseRes.error).toBeUndefined();

    // Round-trip back to YAML
    const regeneratedYaml = graphToYaml(yamlWithUnknowns, parseRes.nodes);

    expect(regeneratedYaml).toContain('Custom header comment');
    expect(regeneratedYaml).toContain('custom_threshold: 99');
    expect(regeneratedYaml).toContain('custom.internal.action');
    expect(regeneratedYaml).toContain('custom_attribute:');
    expect(regeneratedYaml).toContain('value must be preserved');
  });

  it('detects duplicate step names and emits warning', () => {
    const yamlWithDupes = `
name: Dupe Test
triggers:
  - type: manual
steps:
  - name: same_name
    type: console
  - name: same_name
    type: elasticsearch.search
`;
    const parseRes = yamlToGraph(yamlWithDupes);
    expect(parseRes.warnings?.length).toBeGreaterThan(0);
    expect(parseRes.warnings?.[0]).toContain('is used multiple times');
  });

  it('handles if branching steps', () => {
    const ifYaml = `
name: If Test
triggers:
  - type: manual
steps:
  - name: check_alert
    type: if
    condition: "event.severity > 5"
    steps:
      - name: alert_slack
        type: console
        with:
          message: "Kritik"
    else:
      - name: alert_log
        type: console
        with:
          message: "Normal"
`;
    const parseRes = yamlToGraph(ifYaml);
    expect(parseRes.error).toBeUndefined();
    expect(parseRes.nodes.some(n => n.id.includes('then'))).toBe(true);
    expect(parseRes.nodes.some(n => n.id.includes('else'))).toBe(true);
  });

  it('preserves nested if condition and steps inside foreach loop on round-trip', () => {
    const nestedYaml = `name: Nested Test
triggers:
  - type: manual
steps:
  - name: process_items
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: filter_active
        type: if
        condition: "item.active == true"
        steps:
          - name: log_active
            type: console
            with:
              message: "Active item"
`;
    const parseRes = yamlToGraph(nestedYaml);
    expect(parseRes.error).toBeUndefined();

    const regenerated = graphToYaml(nestedYaml, parseRes.nodes);
    expect(regenerated).toContain('filter_active');
    expect(regenerated).toContain('condition: item.active == true');
    expect(regenerated).toContain('log_active');
  });
});
