import fs from 'node:fs';
import path from 'node:path';
import { KibanaConnection, ClientConnectionSummary } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');

export class ConnectionsStore {
  private connections: Map<string, KibanaConnection> = new Map();
  private activeId: string = 'mock-env';

  constructor() {
    this.ensureDataDir();
    this.load();
    this.initializeDefaults();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private initializeDefaults() {
    // 1. Mock connection always available
    if (!this.connections.has('mock-env')) {
      this.connections.set('mock-env', {
        id: 'mock-env',
        name: 'Mock Environment (Local Samples)',
        url: 'http://mock-kibana:5601',
        apiKey: '',
        space: 'default',
        insecureTLS: false,
        isMock: true
      });
    }

    // 2. Initial Kibana from .env if provided
    const envUrl = process.env.KIBANA_URL || 'http://localhost:5601';
    const envApiKey = process.env.KIBANA_API_KEY || '';
    const envSpace = process.env.KIBANA_SPACE || 'default';
    const envInsecure = process.env.KIBANA_INSECURE_TLS === 'true';
    const envMock = process.env.MOCK_MODE !== 'false';

    if (!this.connections.has('env-kibana')) {
      this.connections.set('env-kibana', {
        id: 'env-kibana',
        name: 'Kibana (.env Configuration)',
        url: envUrl,
        apiKey: envApiKey,
        space: envSpace,
        insecureTLS: envInsecure,
        isMock: false
      });
    }

    // Set active ID based on MOCK_MODE only if activeId is not already loaded
    if (!this.connections.has(this.activeId)) {
      if (envMock) {
        this.activeId = 'mock-env';
      } else {
        this.activeId = 'env-kibana';
      }
    }

    this.save();
  }

  private load() {
    try {
      if (fs.existsSync(CONNECTIONS_FILE)) {
        const raw = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.connections)) {
          for (const c of data.connections) {
            this.connections.set(c.id, c);
          }
        }
        if (data.activeId && this.connections.has(data.activeId)) {
          this.activeId = data.activeId;
        }
      }
    } catch (err) {
      console.error('Error loading connections.json:', err);
    }
  }

  private save() {
    try {
      const data = {
        activeId: this.activeId,
        connections: Array.from(this.connections.values())
      };
      fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving connections.json:', err);
    }
  }

  public getActiveConnection(): KibanaConnection {
    return this.connections.get(this.activeId) || this.connections.get('mock-env')!;
  }

  public setActiveConnection(id: string): boolean {
    if (this.connections.has(id)) {
      this.activeId = id;
      this.save();
      return true;
    }
    return false;
  }

  public getAll(): ClientConnectionSummary[] {
    return Array.from(this.connections.values()).map(c => ({
      id: c.id,
      name: c.name,
      url: c.url,
      apiKeyMasked: c.apiKey ? `${c.apiKey.slice(0, 4)}••••${c.apiKey.slice(-4)}` : '',
      space: c.space,
      insecureTLS: c.insecureTLS,
      isMock: c.isMock,
      isActive: c.id === this.activeId
    }));
  }

  public saveConnection(conn: Omit<KibanaConnection, 'isMock'> & { isMock?: boolean }): KibanaConnection {
    const existing = this.connections.get(conn.id);
    const updated: KibanaConnection = {
      id: conn.id,
      name: conn.name,
      url: conn.url,
      // If client didn't update masked API key, keep the existing one
      apiKey: conn.apiKey && !conn.apiKey.includes('••••') ? conn.apiKey : (existing?.apiKey || ''),
      space: conn.space || 'default',
      insecureTLS: !!conn.insecureTLS,
      isMock: !!conn.isMock
    };
    this.connections.set(updated.id, updated);
    this.save();
    return updated;
  }

  public deleteConnection(id: string): boolean {
    if (id === 'mock-env') return false; // cannot delete mock
    const deleted = this.connections.delete(id);
    if (this.activeId === id) {
      this.activeId = 'mock-env';
    }
    this.save();
    return deleted;
  }
}
