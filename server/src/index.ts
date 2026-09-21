import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import yaml from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import { ConnectionsStore } from './connectionsStore.js';
import { AuthStore } from './authStore.js';
import { RevisionStore } from './revisionStore.js';
import { MockWorkflowService, RealKibanaService, IWorkflowService } from './kibanaClient.js';
import { WorkflowSaveRequest, WorkflowRevisionAuthor, WorkflowItem } from './types.js';
import { validateWorkflow } from './workflowValidator.js';
import { sanitizeSensitiveString } from './sanitizer.js';

dotenv.config();

// SSL / TLS configuration for HTTPS
const certPath = path.resolve(process.cwd(), '../certs/cert.pem');
const keyPath = path.resolve(process.cwd(), '../certs/key.pem');

let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

const fastify = Fastify({
  logger: true,
  ...(httpsOptions ? { https: httpsOptions } : {})
} as any);

const store = new ConnectionsStore();
const authStore = new AuthStore();
const revisionStore = new RevisionStore();
const mockService = new MockWorkflowService();

function getAuthorFromReq(req: any): WorkflowRevisionAuthor {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query as any)?.token;
  if (token) {
    const user = authStore.getUserByToken(token);
    if (user) {
      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarColor: user.avatarColor,
        role: user.role
      };
    }
  }
  return {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'System Administrator',
    avatarColor: '#00bfb3',
    role: 'admin'
  };
}

function getActiveService(): IWorkflowService {
  const active = store.getActiveConnection();
  if (active.isMock) {
    return mockService;
  }
  return new RealKibanaService(active);
}

async function start() {
  await fastify.register(cors, {
    origin: true
  });

  fastify.setErrorHandler((error: any, _request: any, reply: any) => {
    const statusCode = error.statusCode || 500;
    const cleanMessage = sanitizeSensitiveString(error.message || 'Internal Server Error');
    fastify.log.error(cleanMessage);
    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message: cleanMessage
    });
  });

  // --- Authentication & User Settings Routes ---
  fastify.post('/api/auth/login', async (req: any, reply: any) => {
    const { username, password } = (req.body as any) || {};
    if (!username || !password) {
      reply.status(400);
      return { error: 'Username and password are required.' };
    }
    try {
      const result = authStore.login(username, password);
      if (!result) {
        reply.status(401);
        return { error: 'Invalid username or password.' };
      }
      return result;
    } catch (err: any) {
      reply.status(403);
      return { error: err.message };
    }
  });

  fastify.get('/api/auth/me', async (req: any, reply: any) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query as any)?.token;
    if (!token) {
      reply.status(401);
      return { error: 'Not authenticated.' };
    }
    const user = authStore.getUserByToken(token);
    if (!user) {
      reply.status(401);
      return { error: 'Session expired or invalid.' };
    }
    return { user };
  });

  fastify.post('/api/auth/logout', async (req: any) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query as any)?.token;
    if (token) {
      authStore.logout(token);
    }
    return { success: true };
  });

  fastify.put('/api/auth/profile', async (req: any, reply: any) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query as any)?.token;
    if (!token) {
      reply.status(401);
      return { error: 'Not authenticated.' };
    }
    const user = authStore.getUserByToken(token);
    if (!user) {
      reply.status(401);
      return { error: 'Session expired or invalid.' };
    }
    const body = req.body as any;
    const updated = authStore.updateProfile(user.id, body);
    return { user: updated };
  });

  fastify.post('/api/auth/change-password', async (req: any, reply: any) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query as any)?.token;
    if (!token) {
      reply.status(401);
      return { error: 'Not authenticated.' };
    }
    const user = authStore.getUserByToken(token);
    if (!user) {
      reply.status(401);
      return { error: 'Session expired or invalid.' };
    }
    const { currentPassword, newPassword } = (req.body as any) || {};
    try {
      authStore.changePassword(user.id, currentPassword, newPassword);
      return { success: true, message: 'Password changed successfully.' };
    } catch (err: any) {
      reply.status(400);
      return { error: err.message };
    }
  });

  // --- User Management Routes ---
  fastify.get('/api/users', async () => {
    return { users: authStore.listUsers() };
  });

  fastify.post('/api/users', async (req: any, reply: any) => {
    const body = (req.body as any) || {};
    if (!body.username || !body.password || !body.fullName) {
      reply.status(400);
      return { error: 'Username, password, and full name are required.' };
    }
    try {
      const created = authStore.createUser({
        username: body.username,
        password: body.password,
        fullName: body.fullName,
        email: body.email || '',
        role: body.role || 'editor',
        enabled: body.enabled !== undefined ? !!body.enabled : true
      });
      return { success: true, user: created };
    } catch (err: any) {
      reply.status(400);
      return { error: err.message };
    }
  });

  fastify.put('/api/users/:id', async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    try {
      const updated = authStore.updateUser(id, {
        fullName: body.fullName,
        email: body.email,
        role: body.role,
        enabled: body.enabled,
        newPassword: body.newPassword
      });
      return { success: true, user: updated };
    } catch (err: any) {
      reply.status(400);
      return { error: err.message };
    }
  });

  fastify.patch('/api/users/:id/status', async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    if (typeof body.enabled !== 'boolean') {
      reply.status(400);
      return { error: 'Field "enabled" must be a boolean.' };
    }
    try {
      const updated = authStore.updateUser(id, { enabled: body.enabled });
      return { success: true, user: updated };
    } catch (err: any) {
      reply.status(400);
      return { error: err.message };
    }
  });

  fastify.delete('/api/users/:id', async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    try {
      authStore.deleteUser(id);
      return { success: true };
    } catch (err: any) {
      reply.status(400);
      return { error: err.message };
    }
  });

  // --- Connections / Integrations Routes ---
  fastify.get('/api/connections', async () => {
    return {
      connections: store.getAll(),
      activeConnection: store.getActiveConnection().id
    };
  });

  fastify.post('/api/connections', async (req) => {
    const body = req.body as any;
    if (!body || !body.name || !body.url) {
      throw new Error('Connection name and URL are required.');
    }
    const id = body.id || `conn-${Date.now()}`;
    const saved = store.saveConnection({
      id,
      name: body.name,
      url: body.url,
      apiKey: body.apiKey || '',
      space: body.space || 'default',
      insecureTLS: !!body.insecureTLS,
      isMock: !!body.isMock
    });
    return { success: true, connection: saved };
  });

  fastify.delete('/api/connections/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = store.deleteConnection(id);
    if (!ok) {
      reply.status(400);
      return { error: 'Mock connection cannot be deleted or connection not found.' };
    }
    return { success: true };
  });

  fastify.post('/api/connections/select', async (req) => {
    const { id } = req.body as { id: string };
    const ok = store.setActiveConnection(id);
    if (!ok) {
      throw new Error(`Connection not found: ${id}`);
    }
    return { success: true, activeId: id };
  });

  fastify.post('/api/connections/test', async (req) => {
    const body = req.body as any;
    let service: IWorkflowService;
    if (body && body.url) {
      service = new RealKibanaService({
        id: 'temp-test',
        name: 'Test',
        url: body.url,
        apiKey: body.apiKey || '',
        space: body.space || 'default',
        insecureTLS: !!body.insecureTLS,
        isMock: false
      });
    } else {
      service = getActiveService();
    }
    return await service.testConnection();
  });

  // --- Workflows Routes ---
  fastify.get('/api/workflows', async () => {
    const service = getActiveService();
    return await service.listWorkflows();
  });

  fastify.get('/api/workflows/:id', async (req) => {
    const { id } = req.params as { id: string };
    const service = getActiveService();
    return await service.getWorkflow(id);
  });

  fastify.post('/api/workflows', async (req) => {
    const body = req.body as WorkflowSaveRequest;
    const service = getActiveService();
    const saved = await service.saveWorkflow(body);
    const author = getAuthorFromReq(req);
    revisionStore.addRevision(saved.id, saved.yaml, author, {
      name: saved.name,
      description: saved.description,
      enabled: saved.enabled
    });
    return saved;
  });

  fastify.put('/api/workflows/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as WorkflowSaveRequest;
    body.id = id;
    const service = getActiveService();
    const saved = await service.saveWorkflow(body);
    const author = getAuthorFromReq(req);
    revisionStore.addRevision(saved.id, saved.yaml, author, {
      name: saved.name,
      description: saved.description,
      enabled: saved.enabled
    });
    return saved;
  });

  fastify.delete('/api/workflows/:id', async (req) => {
    const { id } = req.params as { id: string };
    const service = getActiveService();
    const res = await service.deleteWorkflow(id);
    if (res) {
      revisionStore.deleteRevisions(id);
    }
    return res;
  });

  // --- Workflow Revision History & Rollback Routes ---
  fastify.get('/api/workflows/:id/revisions', async (req) => {
    const { id } = req.params as { id: string };
    const service = getActiveService();
    let currentWf: WorkflowItem | null = null;
    try {
      currentWf = await service.getWorkflow(id);
    } catch {}

    const revisions = revisionStore.getRevisions(id, currentWf ? {
      name: currentWf.name,
      yaml: currentWf.yaml,
      description: currentWf.description,
      enabled: currentWf.enabled
    } : undefined);

    return { revisions };
  });

  fastify.get('/api/workflows/:id/revisions/:revId', async (req, reply) => {
    const { id, revId } = req.params as { id: string; revId: string };
    const rev = revisionStore.getRevision(id, revId);
    if (!rev) {
      reply.status(404);
      return { error: `Revision "${revId}" not found for workflow "${id}".` };
    }
    return { revision: rev };
  });

  fastify.post('/api/workflows/:id/rollback', async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const { revisionId, note } = (req.body as any) || {};
    if (!revisionId) {
      reply.status(400);
      return { error: 'revisionId is required for rollback.' };
    }

    const targetRev = revisionStore.getRevision(id, revisionId);
    if (!targetRev) {
      reply.status(404);
      return { error: `Target revision "${revisionId}" not found.` };
    }

    const service = getActiveService();
    const author = getAuthorFromReq(req);

    // Save restored YAML back to active service (Kibana / Mock)
    const saved = await service.saveWorkflow({
      id,
      name: targetRev.name,
      description: targetRev.description,
      enabled: targetRev.enabled,
      yaml: targetRev.yaml
    });

    // Record the rollback as a new revision
    const rollbackSummary = note || `Rollback to Revision #${targetRev.revisionNumber}`;
    const newRev = revisionStore.addRevision(id, targetRev.yaml, author, {
      name: saved.name,
      description: saved.description,
      enabled: saved.enabled,
      summary: rollbackSummary
    });

    return {
      success: true,
      workflow: saved,
      revision: newRev
    };
  });

  // --- Workflow Executions & Live Monitoring ---
  fastify.post('/api/workflows/run', async (req) => {
    const body = req.body as { workflowId?: string; workflowYaml?: string; inputs?: Record<string, any> };
    const service = getActiveService();
    return await service.runWorkflow(body);
  });

  fastify.get('/api/workflows/executions/:id', async (req) => {
    const { id } = req.params as { id: string };
    const service = getActiveService();
    return await service.getExecution(id);
  });

  fastify.get('/api/workflows/:workflowId/executions', async (req) => {
    const { workflowId } = req.params as { workflowId: string };
    const service = getActiveService();
    return await service.listExecutions(workflowId);
  });

  fastify.post('/api/workflows/executions/:id/cancel', async (req) => {
    const { id } = req.params as { id: string };
    const service = getActiveService();
    const ok = await service.cancelExecution(id);
    return { success: ok };
  });

  // --- YAML & Schema Validation Endpoints ---
  fastify.post('/api/workflows/validate', async (req) => {
    const { yaml: yamlContent } = req.body as { yaml: string };
    return validateWorkflow(yamlContent);
  });

  fastify.get('/api/workflows/schema', async (req, reply) => {
    const schemaPath = path.resolve(process.cwd(), 'data/kibanaSchema.json');
    if (fs.existsSync(schemaPath)) {
      reply.header('Content-Type', 'application/json');
      return fs.readFileSync(schemaPath, 'utf8');
    }
    const catalogPath = path.resolve(process.cwd(), 'data/schemaCatalog.json');
    if (fs.existsSync(catalogPath)) {
      reply.header('Content-Type', 'application/json');
      return fs.readFileSync(catalogPath, 'utf8');
    }
    return { error: 'Schema not available.' };
  });

  fastify.post('/api/validate-yaml', async (req) => {
    const { yaml: yamlContent } = req.body as { yaml: string };
    return validateWorkflow(yamlContent);
  });

  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    const protocol = httpsOptions ? 'https' : 'http';
    console.log(`Server listening at ${protocol}://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
