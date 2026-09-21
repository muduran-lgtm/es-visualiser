import { describe, it, expect } from 'vitest';
import { validateWorkflowYaml, applyQuickFix, applyAllQuickFixes, QuickFix } from './validator.js';

describe('validator: Official Kibana Workflows Schema Engine (445+ Step Types)', () => {
  it('detects missing connector-id on slack connector step and provides quick fix', () => {
    const yaml = `name: Test Slack
triggers:
  - type: manual
steps:
  - name: notify_slack
    type: slack
    with:
      message: "Hello Slack"
`;
    const res = validateWorkflowYaml(yaml);
    expect(res.valid).toBe(false);
    const connErr = res.errors.find(e => e.message.includes('connector-id expects value'));
    expect(connErr).toBeDefined();
    expect(connErr?.quickFix).toBeDefined();
    expect(connErr?.quickFix?.action).toBe('set_field');
    expect(connErr?.quickFix?.value).toBe('slack-connector-id');

    // Apply quick fix
    const fixedYaml = applyQuickFix(yaml, connErr!.quickFix!);
    const fixedRes = validateWorkflowYaml(fixedYaml);
    expect(fixedRes.valid).toBe(true);
    expect(fixedYaml).toContain('connector-id: slack-connector-id');
  });

  it('detects missing foreach and steps on foreach step and infers aggregation expression', () => {
    const yaml = `name: Test Foreach Inference
triggers:
  - type: manual
steps:
  - name: top_sources
    type: elasticsearch.search
    with:
      index: "logs-*"
      aggs:
        by_host:
          terms:
            field: host.name
            size: 5
  - name: list_top_hosts
    type: foreach
`;
    const res = validateWorkflowYaml(yaml);
    expect(res.valid).toBe(false);

    const foreachErr = res.errors.find(e => e.message.includes('foreach expects value'));
    expect(foreachErr?.quickFix).toBeDefined();
    expect(foreachErr?.quickFix?.value).toBe('{{ steps.top_sources.output.aggregations.by_host.buckets }}');

    const stepsErr = res.errors.find(e => e.message.includes('steps expects value'));
    expect(stepsErr?.quickFix).toBeDefined();
    expect(Array.isArray(stepsErr?.quickFix?.value)).toBe(true);
  });

  it('detects missing condition on if block and provides quick fix', () => {
    const yaml = `name: Test If
triggers:
  - type: manual
steps:
  - name: my_if
    type: if
    steps:
      - name: s1
        type: console
        with:
          message: "ok"
`;
    const res = validateWorkflowYaml(yaml);
    expect(res.valid).toBe(false);
    const condErr = res.errors.find(e => e.message.includes('condition expects value'));
    expect(condErr?.quickFix).toBeDefined();
    expect(condErr?.quickFix?.value).toBe('true');

    const fixed = applyQuickFix(yaml, condErr!.quickFix!);
    expect(validateWorkflowYaml(fixed).valid).toBe(true);
  });

  it('detects invalid term query boolean without value object and provides fix', () => {
    const yaml = `name: Test Term
triggers:
  - type: manual
steps:
  - name: search_flagged
    type: elasticsearch.search
    with:
      index: "logs"
      query:
        term:
          high_value: true
`;
    const res = validateWorkflowYaml(yaml);
    expect(res.valid).toBe(false);
    const termErr = res.errors.find(e => e.message.includes('high_value must be one of'));
    expect(termErr?.quickFix).toBeDefined();
    expect(termErr?.quickFix?.action).toBe('fix_term_query');

    const fixed = applyQuickFix(yaml, termErr!.quickFix!);
    expect(validateWorkflowYaml(fixed).valid).toBe(true);
    expect(fixed).toContain('high_value:');
    expect(fixed).toContain('value: true');
  });

  it('detects typo and offers rename_field quick fix', () => {
    const yaml = `name: Test Typo
triggers:
  - type: manual
steps:
  - name: notify_slack
    type: slack
    conector-id: "my-conn"
    with:
      message: "hello"
`;
    const res = validateWorkflowYaml(yaml);
    const typoErr = res.errors.find(e => e.message.includes('Did you mean "connector-id"?'));
    expect(typoErr).toBeDefined();
    expect(typoErr?.quickFix?.action).toBe('rename_field');
    expect(typoErr?.quickFix?.newKey).toBe('connector-id');

    const fixed = applyQuickFix(yaml, typoErr!.quickFix!);
    expect(fixed).toContain('connector-id: my-conn');
    expect(fixed).not.toContain('conector-id:');
  });

  it('fixes all 3 issues on wf-custom-7521 atomically using applyAllQuickFixes', () => {
    const wfCustom7521 = `name: Orta - Log Hacmi Izleme ve Bildirim
triggers:
  - type: scheduled
    with:
      every: 1h
  - type: manual

steps:
  - name: count_events
    type: elasticsearch.search
    with:
      index: "logs-*"
      size: 0
  - name: top_sources
    type: elasticsearch.search
    with:
      index: "logs-*"
      aggs:
        by_host:
          terms:
            field: host.name
            size: 5
      size: 0
  - name: evaluate_threshold
    type: if
    condition: steps.count_events.output.hits.total.value > 10000
    steps:
      - name: list_top_hosts
        type: foreach
      - name: notify_slack
        type: slack
        with:
          message: ":warning: Log hacmi esigi asildi!"
    else:
      - name: log_normal
        type: console
        with:
          message: "Hacim normal"
`;

    // 1. Initially invalid: 3 errors detected
    const initialRes = validateWorkflowYaml(wfCustom7521);
    expect(initialRes.valid).toBe(false);
    expect(initialRes.errors.length).toBe(3);

    const fixable = initialRes.errors.filter(e => e.quickFix).map(e => e.quickFix!);
    expect(fixable.length).toBe(3);

    // 2. Apply all fixes in 1-click
    const fixedYaml = applyAllQuickFixes(wfCustom7521, fixable);
    const fixedRes = validateWorkflowYaml(fixedYaml);

    // 3. Must be 100% valid!
    expect(fixedRes.valid).toBe(true);
    expect(fixedRes.errors.filter(e => e.severity === 'error').length).toBe(0);
    expect(fixedYaml).toContain('connector-id: slack-connector-id');
    expect(fixedYaml).toContain('foreach: "{{ steps.top_sources.output.aggregations.by_host.buckets }}"');
  });

  it('passes cleanly on valid workflow with proper slack and loop', () => {
    const validYaml = `name: Valid Flow
triggers:
  - type: manual
steps:
  - name: notify_slack
    type: slack
    connector-id: "my-slack-connector"
    with:
      message: "Alert triggered"
  - name: loop_items
    type: foreach
    foreach: "{{ steps.notify_slack.output }}"
    steps:
      - name: log_item
        type: console
        with:
          message: "Processing item"
`;
    const res = validateWorkflowYaml(validYaml);
    expect(res.valid).toBe(true);
    expect(res.errors.filter(e => e.severity === 'error').length).toBe(0);
  });
});
