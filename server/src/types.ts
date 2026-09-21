export interface KibanaConnection {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  space: string;
  insecureTLS: boolean;
  isMock: boolean;
}

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

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  yaml: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSaveRequest {
  id?: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  tags?: string[];
  yaml: string;
  expectedUpdatedAt?: string;
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

export interface WorkflowRevisionAuthor {
  id: string;
  username: string;
  fullName: string;
  avatarColor?: string;
  role?: string;
}

export interface WorkflowRevision {
  revisionId: string;
  workflowId: string;
  revisionNumber: number;
  timestamp: string;
  author: WorkflowRevisionAuthor;
  summary: string;
  yaml: string;
  name?: string;
  description?: string;
  enabled?: boolean;
}

