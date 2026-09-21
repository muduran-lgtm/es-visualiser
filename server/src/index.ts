import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import yaml from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import { ConnectionsStore } from './connectionsStore.js';
import { AuthStore } from './authStore.js';
import { MockWorkflowService, RealKibanaService, IWorkflowService } from './kibanaClient.js';
import { WorkflowSaveRequest } from './types.js';
import { validateWorkflow } from './workflowValidator.js';

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
const mockService = new MockWorkflowService();

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

  // --- Authentication & User Settings Routes ---
  fastify.post('/api/auth/login', async (req: any, reply: any) => {
    const { username, password } = (req.body as any) || {};
    if (!username || !password) {
      reply.status(400);
      return { error: 'Username and password are required.' };
    }
    const result = authStore.login(username, password);
    if (!result) {
      reply.status(401);
      return { error: 'Invalid username or password.' };
    }
    return result;
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
        role: body.role || 'editor'
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
        newPassword: body.newPassword
      });
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
    return await service.saveWorkflow(body);
  });

  fastify.put('/api/workflows/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as WorkflowSaveRequest;
    body.id = id;
    const service = getActiveService();
    return await service.saveWorkflow(body);
  });

  fastify.delete('/api/workflows/:id', async (req) => {
    const { id } = req.params as { id: string };
    const service = getActiveService();
    return await service.deleteWorkflow(id);
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
