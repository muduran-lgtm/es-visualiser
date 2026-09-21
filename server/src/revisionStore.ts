import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'yaml';
import { WorkflowRevision, WorkflowRevisionAuthor } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const REVISIONS_FILE = path.join(DATA_DIR, 'revisions.json');
const MAX_REVISIONS_PER_WORKFLOW = 10;

export class RevisionStore {
  // Map of workflowId -> array of revisions (ordered from newest to oldest)
  private revisions: Map<string, WorkflowRevision[]> = new Map();

  constructor() {
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(REVISIONS_FILE)) {
        const raw = fs.readFileSync(REVISIONS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          for (const [wfId, list] of Object.entries(data)) {
            if (Array.isArray(list)) {
              this.revisions.set(wfId, list.slice(0, MAX_REVISIONS_PER_WORKFLOW));
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading revisions.json:', err);
    }
  }

  private save() {
    try {
      const obj: Record<string, WorkflowRevision[]> = {};
      for (const [wfId, list] of this.revisions.entries()) {
        obj[wfId] = list;
      }
      fs.writeFileSync(REVISIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving revisions.json:', err);
    }
  }

  /**
   * Generates a descriptive summary based on the difference between previous and new YAML.
   */
  private generateSummary(prevYaml: string | null, newYaml: string): string {
    if (!prevYaml) {
      return 'Initial workflow created';
    }

    try {
      const prevDoc = yaml.parse(prevYaml) || {};
      const newDoc = yaml.parse(newYaml) || {};

      const prevSteps = Array.isArray(prevDoc.steps) ? prevDoc.steps.length : 0;
      const newSteps = Array.isArray(newDoc.steps) ? newDoc.steps.length : 0;
      const prevTriggers = Array.isArray(prevDoc.triggers) ? prevDoc.triggers.length : 0;
      const newTriggers = Array.isArray(newDoc.triggers) ? newDoc.triggers.length : 0;

      const stepDiff = newSteps - prevSteps;
      const triggerDiff = newTriggers - prevTriggers;

      const parts: string[] = [];
      if (stepDiff > 0) parts.push(`+${stepDiff} step(s) added`);
      else if (stepDiff < 0) parts.push(`${Math.abs(stepDiff)} step(s) removed`);

      if (triggerDiff > 0) parts.push(`+${triggerDiff} trigger(s) added`);
      else if (triggerDiff < 0) parts.push(`${Math.abs(triggerDiff)} trigger(s) removed`);

      if (prevDoc.name !== newDoc.name) {
        parts.push(`Renamed to "${newDoc.name}"`);
      }

      if (parts.length > 0) {
        return parts.join(', ');
      }

      return 'Updated workflow steps and properties';
    } catch {
      return 'Updated workflow definition';
    }
  }

  /**
   * Retrieves the latest 10 revisions for a workflow.
   */
  public getRevisions(workflowId: string, fallback?: { name?: string; yaml?: string; description?: string; enabled?: boolean }): WorkflowRevision[] {
    let list = this.revisions.get(workflowId);

    if ((!list || list.length === 0) && fallback && fallback.yaml) {
      // Seed an initial baseline revision
      const seed: WorkflowRevision = {
        revisionId: `rev-init-${Date.now().toString(36)}`,
        workflowId,
        revisionNumber: 1,
        timestamp: new Date().toISOString(),
        author: {
          id: 'usr-admin',
          username: 'admin',
          fullName: 'System Administrator',
          avatarColor: '#00bfb3',
          role: 'admin'
        },
        summary: 'Initial baseline revision',
        yaml: fallback.yaml,
        name: fallback.name,
        description: fallback.description,
        enabled: fallback.enabled
      };
      this.revisions.set(workflowId, [seed]);
      this.save();
      return [seed];
    }

    return list ? [...list] : [];
  }

  /**
   * Retrieves a specific revision by ID.
   */
  public getRevision(workflowId: string, revisionId: string): WorkflowRevision | null {
    const list = this.revisions.get(workflowId);
    if (!list) return null;
    return list.find(r => r.revisionId === revisionId) || null;
  }

  /**
   * Adds a new revision to the history, retaining at most 10 recent revisions.
   */
  public addRevision(
    workflowId: string,
    yamlContent: string,
    author: WorkflowRevisionAuthor,
    metadata?: {
      name?: string;
      description?: string;
      enabled?: boolean;
      summary?: string;
    }
  ): WorkflowRevision {
    const existingList = this.revisions.get(workflowId) || [];
    const prevRevision = existingList[0] || null;

    // Don't add duplicate revision if YAML is identical to the latest revision
    if (prevRevision && prevRevision.yaml.trim() === yamlContent.trim()) {
      return prevRevision;
    }

    const nextRevNumber = prevRevision ? prevRevision.revisionNumber + 1 : 1;
    const summary = metadata?.summary || this.generateSummary(prevRevision ? prevRevision.yaml : null, yamlContent);

    const newRev: WorkflowRevision = {
      revisionId: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      workflowId,
      revisionNumber: nextRevNumber,
      timestamp: new Date().toISOString(),
      author: {
        id: author.id || 'usr-admin',
        username: author.username || 'admin',
        fullName: author.fullName || 'System Administrator',
        avatarColor: author.avatarColor || '#00bfb3',
        role: author.role || 'admin'
      },
      summary,
      yaml: yamlContent,
      name: metadata?.name,
      description: metadata?.description,
      enabled: metadata?.enabled
    };

    // Prepend new revision and enforce rolling limit of 10
    const updatedList = [newRev, ...existingList].slice(0, MAX_REVISIONS_PER_WORKFLOW);
    this.revisions.set(workflowId, updatedList);
    this.save();

    return newRev;
  }

  /**
   * Deletes all revisions for a deleted workflow.
   */
  public deleteRevisions(workflowId: string): void {
    if (this.revisions.has(workflowId)) {
      this.revisions.delete(workflowId);
      this.save();
    }
  }
}
