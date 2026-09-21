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
