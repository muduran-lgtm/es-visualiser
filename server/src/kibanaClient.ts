import { Agent } from 'undici';
import yaml from 'yaml';
import { KibanaConnection, WorkflowItem, WorkflowSaveRequest } from './types.js';
import { INITIAL_MOCK_WORKFLOWS } from './mockData.js';

export interface IWorkflowService {
  listWorkflows(): Promise<WorkflowItem[]>;
  getWorkflow(id: string): Promise<WorkflowItem>;
  saveWorkflow(req: WorkflowSaveRequest): Promise<WorkflowItem>;
  deleteWorkflow(id: string): Promise<boolean>;
  testConnection(): Promise<{ ok: boolean; message: string; version?: string }>;
}

export class MockWorkflowService implements IWorkflowService {
  private workflows: Map<string, WorkflowItem> = new Map();

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
      // 1. First test Workflows API directly (verification of auth and access)
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

      // 2. Workflows returned error, try Kibana overall status
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
        // If 404, it's a new workflow, ignore
        if (!err.message?.includes('404')) {
          throw err;
        }
      }
    }

    // Try PUT if ID exists, or POST if new
    let res: Response;
    if (id) {
      // Check if workflow exists or directly attempt PUT
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

      // If 404, fallback to POST /api/workflows/workflow
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
      throw new Error(`Kibana Validation/Save Error (${res.status}): ${errorMsg}`);
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
}
