import { 
  ClientConnectionSummary, 
  WorkflowSummary, 
  WorkflowExecutionDetail, 
  WorkflowExecutionSummary,
  WorkflowRevision 
} from '../types.js';
import { sanitizeSensitiveData, sanitizeSensitiveString } from './sanitizer.js';
import { getStoredToken } from './auth.js';

const API_BASE = '/api';

export async function fetchConnections(): Promise<{
  connections: ClientConnectionSummary[];
  activeConnection: string;
}> {
  const res = await fetch(`${API_BASE}/connections`);
  if (!res.ok) throw new Error('Failed to load connections.');
  return await res.json();
}

export async function saveConnectionApi(conn: any): Promise<any> {
  const res = await fetch(`${API_BASE}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conn)
  });
  if (!res.ok) throw new Error('Failed to save connection.');
  return await res.json();
}

export async function deleteConnectionApi(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/connections/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete connection.');
  return await res.json();
}

export async function selectConnectionApi(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/connections/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) throw new Error('Failed to select connection.');
  return await res.json();
}

export async function testConnectionApi(connData?: any): Promise<{ ok: boolean; message: string; version?: string }> {
  const res = await fetch(`${API_BASE}/connections/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connData || {})
  });
  return await res.json();
}

export async function fetchWorkflows(): Promise<WorkflowSummary[]> {
  const res = await fetch(`${API_BASE}/workflows`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to fetch workflow list.');
  }
  return await res.json();
}

export async function fetchWorkflow(id: string): Promise<WorkflowSummary> {
  const res = await fetch(`${API_BASE}/workflows/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch workflow (${id}).`);
  }
  return await res.json();
}

export async function saveWorkflowApi(req: {
  id?: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  tags?: string[];
  yaml: string;
  expectedUpdatedAt?: string;
}): Promise<WorkflowSummary> {
  const isUpdate = !!req.id;
  const url = isUpdate ? `${API_BASE}/workflows/${encodeURIComponent(req.id!)}` : `${API_BASE}/workflows`;
  const method = isUpdate ? 'PUT' : 'POST';

  const token = getStoredToken();
  const res = await fetch(url, {
    method,
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.message || parsed.error || text;
    } catch {}
    throw new Error(sanitizeSensitiveString(errorMsg));
  }

  return await res.json();
}

// --- Workflow Revision History & Rollback APIs ---

export async function fetchWorkflowRevisions(workflowId: string): Promise<WorkflowRevision[]> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/workflows/${encodeURIComponent(workflowId)}/revisions`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to fetch revision history.');
  }

  const data = await res.json();
  return data.revisions || [];
}

export async function rollbackWorkflowApi(
  workflowId: string, 
  revisionId: string, 
  note?: string
): Promise<{ success: boolean; workflow: WorkflowSummary; revision: WorkflowRevision }> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/workflows/${encodeURIComponent(workflowId)}/rollback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ revisionId, note })
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.message || parsed.error || text;
    } catch {}
    throw new Error(sanitizeSensitiveString(errorMsg));
  }

  return await res.json();
}

// --- Live Execution & Monitoring APIs ---

export async function runWorkflowApi(req: {
  workflowId?: string;
  workflowYaml?: string;
  inputs?: Record<string, any>;
}): Promise<{ executionId: string }> {
  const res = await fetch(`${API_BASE}/workflows/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.message || parsed.error || text;
    } catch {}
    throw new Error(sanitizeSensitiveString(msg));
  }

  return await res.json();
}

export async function fetchExecutionApi(executionId: string): Promise<WorkflowExecutionDetail> {
  const res = await fetch(`${API_BASE}/workflows/executions/${encodeURIComponent(executionId)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(sanitizeSensitiveString(text) || `Failed to fetch execution (${executionId}).`);
  }
  const data = await res.json();
  return sanitizeSensitiveData(data);
}

export async function fetchWorkflowExecutionsApi(workflowId: string): Promise<WorkflowExecutionSummary[]> {
  const res = await fetch(`${API_BASE}/workflows/${encodeURIComponent(workflowId)}/executions`);
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function cancelExecutionApi(executionId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/workflows/executions/${encodeURIComponent(executionId)}/cancel`, {
    method: 'POST'
  });
  return res.ok;
}
