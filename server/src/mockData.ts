import { WorkflowItem } from './types.js';

export const INITIAL_MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: "simple-manual-log",
    name: "Simple Manual Logging",
    description: "Starter workflow triggered manually that prints a log message to the console.",
    enabled: true,
    tags: ["demo", "manual", "starter"],
    createdAt: "2026-09-18T10:00:00.000Z",
    updatedAt: "2026-09-18T10:00:00.000Z",
    yaml: `# ═══════════════════════════════════════════════════════════════
# Simple Manual Logging Workflow
# ═══════════════════════════════════════════════════════════════
name: Simple Manual Logging
description: Starter workflow triggered manually that prints a log message to the console.
enabled: true
tags:
  - demo
  - manual
  - starter

triggers:
  - type: manual

steps:
  - name: print_greeting
    type: console
    with:
      message: "Hello! Manually triggered Kibana workflow executed successfully."
`
  },
  {
    id: "security-alert-enrichment",
    name: "Security Alert Enrichment",
    description: "Multi-step workflow querying Elasticsearch for an incoming security alert and logging findings.",
    enabled: true,
    tags: ["security", "enrichment", "production"],
    createdAt: "2026-09-18T11:00:00.000Z",
    updatedAt: "2026-09-18T11:00:00.000Z",
    yaml: `# ═══════════════════════════════════════════════════════════════
# Security Alert Enrichment
# ═══════════════════════════════════════════════════════════════
name: Security Alert Enrichment
description: Multi-step workflow querying Elasticsearch for an incoming security alert and logging findings.
enabled: true
tags:
  - security
  - enrichment
  - production

consts:
  target_index: "kibana-sample-data-logs"
  alert_severity_threshold: 75

triggers:
  - type: alert

steps:
  - name: query_ip_reputation
    type: elasticsearch.search
    with:
      index: "{{ consts.target_index }}"
      query:
        term:
          source.ip: "{{ event.alerts[0].source.ip }}"
      size: 5

  - name: log_enrichment_result
    type: console
    with:
      message: |
        Enrichment completed.
        Analyzed IP: {{ event.alerts[0].source.ip }}
        Total matched log hits: {{ steps.query_ip_reputation.output.hits.total.value }}
`
  },
  {
    id: "log-cleanup-and-routing",
    name: "Conditional Routing and Loop",
    description: "Advanced flow control workflow demonstrating if conditions and foreach loops.",
    enabled: true,
    tags: ["advanced", "flow-control", "demo"],
    createdAt: "2026-09-18T12:00:00.000Z",
    updatedAt: "2026-09-18T12:00:00.000Z",
    yaml: `# ═══════════════════════════════════════════════════════════════
# Conditional Routing and Loop (if & foreach)
# ═══════════════════════════════════════════════════════════════
name: Conditional Routing and Loop
description: Advanced flow control workflow demonstrating if conditions and foreach loops.
enabled: true
tags:
  - advanced
  - flow-control
  - demo

triggers:
  - type: scheduled
    with:
      every: "30m"

steps:
  - name: check_risk_score
    type: if
    condition: "event.alerts[0].kibana.alert.risk_score >= 80"
    steps:
      - name: process_high_severity
        type: foreach
        foreach: "\${{ event.alerts }}"
        max-iterations:
          limit: 25
          on-limit: continue
        steps:
          - name: log_critical_alert
            type: console
            with:
              message: "[CRITICAL] Alert ID: {{ foreach.item._id }} - Index: {{ foreach.index }}"
    else:
      - name: log_routine_notice
        type: console
        with:
          message: "Risk score below threshold; routine check recorded."
`
  }
];
