import { 
  ClientConnectionSummary, 
  WorkflowSummary, 
  WorkflowExecutionDetail, 
  WorkflowExecutionSummary 
} from '../types.js';

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

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.message || parsed.error || text;
    } catch {}
    throw new Error(errorMsg);
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
    throw new Error(msg);
  }

  return await res.json();
}

export async function fetchExecutionApi(executionId: string): Promise<WorkflowExecutionDetail> {
  const res = await fetch(`${API_BASE}/workflows/executions/${encodeURIComponent(executionId)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch execution (${executionId}).`);
  }
  return await res.json();
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
