import { Agent } from 'undici';
import yaml from 'yaml';
import { 
  KibanaConnection, 
  WorkflowItem, 
  WorkflowSaveRequest,
  WorkflowExecutionDetail,
  WorkflowExecutionSummary,
  StepExecutionDetail
} from './types.js';
import { INITIAL_MOCK_WORKFLOWS } from './mockData.js';

export interface IWorkflowService {
  listWorkflows(): Promise<WorkflowItem[]>;
  getWorkflow(id: string): Promise<WorkflowItem>;
  saveWorkflow(req: WorkflowSaveRequest): Promise<WorkflowItem>;
  deleteWorkflow(id: string): Promise<boolean>;
  testConnection(): Promise<{ ok: boolean; message: string; version?: string }>;
  runWorkflow(req: { workflowId?: string; workflowYaml?: string; inputs?: Record<string, any> }): Promise<{ executionId: string }>;
  getExecution(executionId: string): Promise<WorkflowExecutionDetail>;
  listExecutions(workflowId: string): Promise<WorkflowExecutionSummary[]>;
  cancelExecution(executionId: string): Promise<boolean>;
}

export class MockWorkflowService implements IWorkflowService {
  private workflows: Map<string, WorkflowItem> = new Map();
  private executions: Map<string, WorkflowExecutionDetail> = new Map();

  constructor() {
    for (const item of INITIAL_MOCK_WORKFLOWS) {
      this.workflows.set(item.id, { ...item });
    }
  }

  async listWorkflows(): Promise<WorkflowItem[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<WorkflowItem> {
    const item = this.workflows.get(id);
    if (!item) {
      throw new Error(`Workflow not found (ID: ${id})`);
    }
    return { ...item };
  }

  async saveWorkflow(req: WorkflowSaveRequest): Promise<WorkflowItem> {
    // 1. Validate YAML syntax server-side
    const parsedDoc = yaml.parseDocument(req.yaml);
    if (parsedDoc.errors && parsedDoc.errors.length > 0) {
      throw new Error(`YAML Syntax Error: ${parsedDoc.errors.map(e => e.message).join(', ')}`);
    }

    const parsedJson = parsedDoc.toJSON() || {};
    const id = req.id || (parsedJson.name ? parsedJson.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `wf-${Date.now()}`);
    const name = req.name || parsedJson.name || id;

    const existing = this.workflows.get(id);

    // Concurrency conflict check
    if (existing && req.expectedUpdatedAt && existing.updatedAt !== req.expectedUpdatedAt) {
      throw new Error(`Conflict (409): This workflow was updated in another session (Last update: ${existing.updatedAt}). Please refresh changes first.`);
    }

    const now = new Date().toISOString();
    const updatedItem: WorkflowItem = {
      id,
      name,
      description: req.description !== undefined ? req.description : parsedJson.description,
      enabled: req.enabled !== undefined ? req.enabled : (parsedJson.enabled !== false),
      tags: req.tags || parsedJson.tags || [],
      yaml: req.yaml,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    this.workflows.set(id, updatedItem);
    return { ...updatedItem };
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Mock environment connected successfully (3 sample workflows ready).' };
  }

  async runWorkflow(req: { workflowId?: string; workflowYaml?: string; inputs?: Record<string, any> }): Promise<{ executionId: string }> {
    const executionId = `mock-exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    let wfYaml = req.workflowYaml;
    if (!wfYaml && req.workflowId) {
      const wf = this.workflows.get(req.workflowId);
      if (wf) wfYaml = wf.yaml;
    }

    const stepList: { name: string; type: string }[] = [];
    if (wfYaml) {
      try {
        const parsed = yaml.parse(wfYaml);
        if (Array.isArray(parsed.steps)) {
          const extract = (steps: any[]) => {
            for (const s of steps) {
              if (s && s.name) {
                stepList.push({ name: s.name, type: s.type || 'step' });
              }
              if (Array.isArray(s.steps)) extract(s.steps);
            }
          };
          extract(parsed.steps);
        }
      } catch {}
    }

    if (stepList.length === 0) {
      stepList.push({ name: 'log_start', type: 'console' });
      stepList.push({ name: 'search_records', type: 'elasticsearch.search' });
      stepList.push({ name: 'notify_channel', type: 'console' });
    }

    const execution: WorkflowExecutionDetail = {
      id: executionId,
      workflowId: req.workflowId || 'mock-workflow',
      status: 'running',
      isTestRun: true,
      startedAt: now,
      stepExecutions: []
    };
    this.executions.set(executionId, execution);

    // Asynchronous step-by-step runner simulation
    (async () => {
      const startTime = Date.now();
      for (let i = 0; i < stepList.length; i++) {
        if ((execution.status as string) === 'cancelled') break;

        const s = stepList[i];
        const stepStart = new Date().toISOString();

        // 1. Mark step as running
        execution.stepExecutions.push({
          stepId: s.name,
          stepType: s.type,
          status: 'running',
          startedAt: stepStart
        });

        // Realistic execution delay per step
        await new Promise(r => setTimeout(r, 600));

        if ((execution.status as string) === 'cancelled') break;

        // 2. Mark step completed with realistic state
        const currentStep = execution.stepExecutions[execution.stepExecutions.length - 1];
        const duration = Math.floor(Math.random() * 35) + 12;
        currentStep.status = 'completed';
        currentStep.finishedAt = new Date().toISOString();
        currentStep.executionTimeMs = duration;
        currentStep.state = {
          output: s.type.includes('search') 
            ? { hits: { total: { value: 128 }, hits: [{ _id: 'doc-1', _source: { message: 'Sample event processed' } }] } }
            : { status: 'success', message: `Step "${s.name}" executed successfully.` }
        };
      }

      if ((execution.status as string) === 'running') {
        execution.status = 'completed';
        execution.finishedAt = new Date().toISOString();
        execution.duration = Date.now() - startTime;
      }
    })();

    return { executionId };
  }

  async getExecution(executionId: string): Promise<WorkflowExecutionDetail> {
    const exec = this.executions.get(executionId);
    if (!exec) {
      throw new Error(`Execution not found (${executionId})`);
    }
    return { ...exec, stepExecutions: [...exec.stepExecutions] };
  }

  async listExecutions(workflowId: string): Promise<WorkflowExecutionSummary[]> {
    const list: WorkflowExecutionSummary[] = [];
    for (const exec of this.executions.values()) {
      if (!workflowId || exec.workflowId === workflowId) {
        list.push({
          id: exec.id,
          workflowId: exec.workflowId,
          status: exec.status,
          startedAt: exec.startedAt,
          finishedAt: exec.finishedAt,
          duration: exec.duration,
          error: exec.error,
          isTestRun: exec.isTestRun
        });
      }
    }
    return list.reverse();
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const exec = this.executions.get(executionId);
    if (exec && exec.status === 'running') {
      exec.status = 'cancelled';
      exec.finishedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
}

export class RealKibanaService implements IWorkflowService {
  private conn: KibanaConnection;
  private dispatcher: Agent;

  constructor(conn: KibanaConnection) {
    this.conn = conn;
    this.dispatcher = new Agent({
      connect: {
        rejectUnauthorized: !conn.insecureTLS
      }
    });
  }

  private getBaseUrl(): string {
    const cleanUrl = this.conn.url.replace(/\/+$/, '');
    if (this.conn.space && this.conn.space !== 'default') {
      return `${cleanUrl}/s/${encodeURIComponent(this.conn.space)}/api/workflows`;
    }
    return `${cleanUrl}/api/workflows`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true'
    };
    if (this.conn.apiKey) {
      headers['Authorization'] = `ApiKey ${this.conn.apiKey}`;
    }
    return headers;
  }

  async testConnection(): Promise<{ ok: boolean; message: string; version?: string }> {
    try {
      const cleanUrl = this.conn.url.replace(/\/+$/, '');
      const wfUrl = this.getBaseUrl();
      const wfRes = await fetch(wfUrl, {
        headers: this.getHeaders(),
        // @ts-ignore
        dispatcher: this.dispatcher
      });

      if (wfRes.ok) {
        const body = await wfRes.json() as any;
        const count = body.total !== undefined 
          ? body.total 
          : (Array.isArray(body.results) ? body.results.length : (Array.isArray(body.workflows) ? body.workflows.length : 0));
        return {
          ok: true,
          message: `Kibana and Workflows API connected successfully (${count} workflows found)`
        };
      }

      const statusUrl = `${cleanUrl}/api/status`;
      const res = await fetch(statusUrl, {
        headers: this.getHeaders(),
        // @ts-ignore
        dispatcher: this.dispatcher
      });

      if (res.ok) {
        const data = await res.json() as any;
        const level = data?.status?.overall?.level || 'available';
        return {
          ok: true,
          message: `Kibana reachable (Status: ${level}), but Workflows API returned HTTP ${wfRes.status}.`
        };
      }

      return {
        ok: false,
        message: `Kibana did not respond (${res.status} ${res.statusText})`
      };
    } catch (err: any) {
      const detail = err.cause ? ` (${err.cause.code || err.cause.message})` : '';
      return {
        ok: false,
        message: `Kibana connection error${detail}: could not reach ${this.conn.url}. Please check IP, port, and Self-signed TLS settings.`
      };
    }
  }

  async listWorkflows(): Promise<WorkflowItem[]> {
    const url = this.getBaseUrl();
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        // @ts-ignore
        dispatcher: this.dispatcher
      });
    } catch (err: any) {
      const detail = err.cause ? ` (${err.cause.code || err.cause.message})` : '';
      throw new Error(`Failed to reach Kibana server${detail}: could not connect to ${url}.`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list Kibana workflows (${res.status}): ${text}`);
    }

    const body = await res.json() as any;
    const rawList = Array.isArray(body.results)
      ? body.results
      : (Array.isArray(body.workflows) ? body.workflows : (Array.isArray(body) ? body : []));

    return rawList.map((wf: any) => ({
      id: wf.id || wf.name,
      name: wf.name || wf.id,
      description: wf.description,
      enabled: wf.enabled !== false,
      tags: wf.tags || [],
      yaml: wf.yaml || '',
      createdAt: wf.createdAt || wf.created_at || new Date().toISOString(),
      updatedAt: wf.lastUpdatedAt || wf.updatedAt || wf.updated_at || new Date().toISOString()
    }));
  }

  async getWorkflow(id: string): Promise<WorkflowItem> {
    const url = `${this.getBaseUrl()}/workflow/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      // @ts-ignore
      dispatcher: this.dispatcher
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch Kibana workflow (${id}): ${text}`);
    }

    const wf = await res.json() as any;
    return {
      id: wf.id || id,
      name: wf.name || id,
      description: wf.description,
      enabled: wf.enabled !== false,
      tags: wf.tags || [],
      yaml: wf.yaml || '',
      createdAt: wf.createdAt || wf.created_at || new Date().toISOString(),
      updatedAt: wf.lastUpdatedAt || wf.updatedAt || wf.updated_at || new Date().toISOString()
    };
  }

  async saveWorkflow(req: WorkflowSaveRequest): Promise<WorkflowItem> {
    // 1. Server-side YAML syntax validation
    const parsedDoc = yaml.parseDocument(req.yaml);
    if (parsedDoc.errors && parsedDoc.errors.length > 0) {
      throw new Error(`YAML Syntax Error: ${parsedDoc.errors.map(e => e.message).join(', ')}`);
    }

    const parsedJson = parsedDoc.toJSON() || {};
    const id = req.id || parsedJson.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 2. Concurrency check if updating existing
    if (id && req.expectedUpdatedAt) {
      try {
        const existing = await this.getWorkflow(id);
        if (existing.updatedAt && existing.updatedAt !== req.expectedUpdatedAt) {
          throw new Error(`Concurrency Conflict (409): This workflow was updated on Kibana (Kibana timestamp: ${existing.updatedAt}, your reference: ${req.expectedUpdatedAt}). Please reload before saving.`);
        }
      } catch (err: any) {
        if (!err.message?.includes('404')) {
          throw err;
        }
      }
    }

    let res: Response;
    if (id) {
      const putUrl = `${this.getBaseUrl()}/workflow/${encodeURIComponent(id)}`;
      res = await fetch(putUrl, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: req.name || parsedJson.name,
          description: req.description || parsedJson.description,
          enabled: req.enabled !== undefined ? req.enabled : parsedJson.enabled,
          tags: req.tags || parsedJson.tags,
          yaml: req.yaml
        }),
        // @ts-ignore
        dispatcher: this.dispatcher
      });

      if (res.status === 404) {
        const postUrl = `${this.getBaseUrl()}/workflow`;
        res = await fetch(postUrl, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            id,
            yaml: req.yaml
          }),
          // @ts-ignore
          dispatcher: this.dispatcher
        });
      }
    } else {
      const postUrl = `${this.getBaseUrl()}/workflow`;
      res = await fetch(postUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          yaml: req.yaml
        }),
        // @ts-ignore
        dispatcher: this.dispatcher
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.message || parsed.error || errText;
      } catch {}
      throw new Error(`Kibana save error (${res.status}): ${errorMsg}`);
    }

    const saved = await res.json() as any;
    return {
      id: saved.id || id || 'saved-workflow',
      name: saved.name || req.name || parsedJson.name || id,
      description: saved.description || req.description,
      enabled: saved.enabled !== false,
      tags: saved.tags || [],
      yaml: saved.yaml || req.yaml,
      createdAt: saved.createdAt || new Date().toISOString(),
      updatedAt: saved.updatedAt || new Date().toISOString()
    };
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const url = `${this.getBaseUrl()}/workflow/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      // @ts-ignore
      dispatcher: this.dispatcher
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Failed to delete workflow (${id}): ${text}`);
    }
    return true;
  }

  async runWorkflow(req: { workflowId?: string; workflowYaml?: string; inputs?: Record<string, any> }): Promise<{ executionId: string }> {
    const testUrl = `${this.getBaseUrl()}/test`;
    const payload: any = {
      inputs: req.inputs || {}
    };
    if (req.workflowId) payload.workflowId = req.workflowId;
    if (req.workflowYaml) payload.workflowYaml = req.workflowYaml;

    let res = await fetch(testUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      // @ts-ignore
      dispatcher: this.dispatcher
    });

    if (res.ok) {
      const data = await res.json() as any;
      const executionId = data.workflowExecutionId || data.executionId || data.id;
      if (executionId) {
        return { executionId };
      }
    }

    if (req.workflowId) {
      const runUrl = `${this.getBaseUrl()}/workflow/${encodeURIComponent(req.workflowId)}/run`;
      res = await fetch(runUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ inputs: req.inputs || {} }),
        // @ts-ignore
        dispatcher: this.dispatcher
      });

      if (res.ok) {
        const data = await res.json() as any;
        const executionId = data.workflowExecutionId || data.executionId || data.id;
        if (executionId) {
          return { executionId };
        }
      }
    }

    const errText = await res.text();
    let msg = errText;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.message || parsed.error || errText;
    } catch {}
    throw new Error(`Failed to trigger workflow execution: ${msg}`);
  }

  async getExecution(executionId: string): Promise<WorkflowExecutionDetail> {
    const url = `${this.getBaseUrl()}/executions/${encodeURIComponent(executionId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      // @ts-ignore
      dispatcher: this.dispatcher
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch execution (${executionId}): ${text}`);
    }

    const data = await res.json() as any;
    const rawSteps = Array.isArray(data.stepExecutions) ? data.stepExecutions : [];

    return {
      id: data.id || executionId,
      workflowId: data.workflowId || '',
      status: data.status || 'running',
      isTestRun: data.isTestRun,
      startedAt: data.startedAt || new Date().toISOString(),
      finishedAt: data.finishedAt,
      duration: data.duration,
      error: data.error,
      stepExecutions: rawSteps.map((s: any) => ({
        id: s.id,
        stepId: s.stepId,
        stepType: s.stepType,
        status: s.status,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        executionTimeMs: s.executionTimeMs,
        state: s.state,
        error: s.error
      }))
    };
  }

  async listExecutions(workflowId: string): Promise<WorkflowExecutionSummary[]> {
    const url = `${this.getBaseUrl()}/workflow/${encodeURIComponent(workflowId)}/executions`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      // @ts-ignore
      dispatcher: this.dispatcher
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json() as any;
    const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
    return list.map((item: any) => ({
      id: item.id,
      workflowId: item.workflowId || workflowId,
      status: item.status,
      isTestRun: item.isTestRun,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      duration: item.duration,
      error: item.error
    }));
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const url = `${this.getBaseUrl()}/executions/${encodeURIComponent(executionId)}/cancel`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      // @ts-ignore
      dispatcher: this.dispatcher
    });
    return res.ok;
  }
}
