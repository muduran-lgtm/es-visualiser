import { Node, Edge } from '@xyflow/react';

export type StepType = 
  | 'console'
  | 'elasticsearch.search'
  | 'elasticsearch.index'
  | 'elasticsearch.update'
  | 'elasticsearch.delete'
  | 'elasticsearch.esql.query'
  | 'elasticsearch.request'
  | 'kibana.SetAlertsStatus'
  | 'kibana.SetAlertTags'
  | 'kibana.request'
  | 'http.request'
  | 'ai.prompt'
  | 'ai.classify'
  | 'ai.summarize'
  | 'if'
  | 'foreach'
  | 'switch'
  | 'wait'
  | string;

export type TriggerType = 'manual' | 'scheduled' | 'alert' | 'event' | string;

export interface StepDefinition {
  name: string;
  type: StepType;
  description?: string;
  with?: Record<string, any>;
  condition?: string;
  foreach?: string;
  steps?: StepDefinition[];
  else?: StepDefinition[];
  [key: string]: any;
}

export interface TriggerDefinition {
  type: TriggerType;
  with?: Record<string, any>;
  inputs?: any[];
  [key: string]: any;
}

export interface WorkflowAST {
  name: string;
  description?: string;
  enabled?: boolean;
  tags?: string[];
  version?: string;
  triggers: TriggerDefinition[];
  inputs?: any;
  consts?: Record<string, any>;
  outputs?: any;
  settings?: Record<string, any>;
  steps: StepDefinition[];
  [key: string]: any;
}

export interface StepExecutionDetail {
  id?: string;
  stepId: string;
  stepType?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
  executionTimeMs?: number;
  state?: any;
  error?: any;
}

export interface WorkflowExecutionDetail {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  isTestRun?: boolean;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  error?: any;
  stepExecutions: StepExecutionDetail[];
}

export interface WorkflowExecutionSummary {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  isTestRun?: boolean;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  error?: any;
}

export interface WorkflowNodeData {
  id: string;
  nodeCategory: 'trigger' | 'step' | 'flow-control' | 'generic';
  name: string;
  type: string;
  description?: string;
  with?: Record<string, any>;
  condition?: string;
  foreach?: string;
  rawYaml?: string;
  validationError?: string;
  executionStatus?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  executionTimeMs?: number;
  executionOutput?: any;
  executionError?: any;
  [key: string]: any;
}

export type CustomNode = Node<WorkflowNodeData>;

export interface ClientConnectionSummary {
  id: string;
  name: string;
  url: string;
  apiKeyMasked: string;
  space: string;
  insecureTLS: boolean;
  isMock: boolean;
  isActive: boolean;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  yaml: string;
  updatedAt: string;
  createdAt: string;
}

export interface UserPreferences {
  theme: string;
  autoLayoutOnLoad: boolean;
  confirmOnSave: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatarColor: string;
  preferences: UserPreferences;
}
