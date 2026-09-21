import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // SHA-256 for demo safety
  fullName: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatarColor: string;
  preferences: {
    theme: string;
    autoLayoutOnLoad: boolean;
    confirmOnSave: boolean;
  };
}

export interface UserPublicProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatarColor: string;
  preferences: {
    theme: string;
    autoLayoutOnLoad: boolean;
    confirmOnSave: boolean;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export class AuthStore {
  private users: Map<string, UserAccount> = new Map();
  private sessions: Map<string, string> = new Map(); // token -> userId

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
    if (this.users.size === 0) {
      const defaultUsers: UserAccount[] = [
        {
          id: 'usr-admin',
          username: 'admin',
          passwordHash: hashPassword('admin'),
          fullName: 'System Administrator',
          email: 'admin@panoptext.local',
          role: 'admin',
          avatarColor: '#00bfb3',
          preferences: {
            theme: 'dark',
            autoLayoutOnLoad: true,
            confirmOnSave: false
          }
        },
        {
          id: 'usr-engineer',
          username: 'engineer',
          passwordHash: hashPassword('engineer'),
          fullName: 'Lead Workflow Engineer',
          email: 'engineer@panoptext.local',
          role: 'editor',
          avatarColor: '#3274d9',
          preferences: {
            theme: 'dark',
            autoLayoutOnLoad: false,
            confirmOnSave: true
          }
        },
        {
          id: 'usr-operator',
          username: 'operator',
          passwordHash: hashPassword('operator'),
          fullName: 'SOC Operator',
          email: 'operator@panoptext.local',
          role: 'viewer',
          avatarColor: '#f04e98',
          preferences: {
            theme: 'dark',
            autoLayoutOnLoad: false,
            confirmOnSave: false
          }
        }
      ];

      for (const u of defaultUsers) {
        this.users.set(u.username.toLowerCase(), u);
      }
      this.save();
    }
  }

  private load() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            this.users.set(u.username.toLowerCase(), u);
          }
        }
      }
    } catch (err) {
      console.error('Error loading users.json:', err);
    }
  }

  private save() {
    try {
      const data = {
        users: Array.from(this.users.values())
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving users.json:', err);
    }
  }

  public toPublicProfile(u: UserAccount): UserPublicProfile {
    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      avatarColor: u.avatarColor,
      preferences: { ...u.preferences }
    };
  }

  public login(username: string, password: string): { token: string; user: UserPublicProfile } | null {
    const user = this.users.get(username.trim().toLowerCase());
    if (!user) return null;

    const inputHash = hashPassword(password);
    if (user.passwordHash !== inputHash) return null;

    const token = `pnp_${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, user.id);

    return {
      token,
      user: this.toPublicProfile(user)
    };
  }

  public getUserByToken(token: string): UserPublicProfile | null {
    const userId = this.sessions.get(token);
    if (!userId) return null;

    for (const u of this.users.values()) {
      if (u.id === userId) {
        return this.toPublicProfile(u);
      }
    }
    return null;
  }

  public logout(token: string): boolean {
    return this.sessions.delete(token);
  }

  public listUsers(): UserPublicProfile[] {
    return Array.from(this.users.values()).map(u => this.toPublicProfile(u));
  }

  public createUser(data: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
  }): UserPublicProfile {
    const key = data.username.trim().toLowerCase();
    if (this.users.has(key)) {
      throw new Error(`Username "${data.username}" already exists.`);
    }

    const colors = ['#00bfb3', '#3274d9', '#f04e98', '#9353d3', '#fec514', '#00a9e0'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      username: data.username.trim(),
      passwordHash: hashPassword(data.password),
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      role: data.role || 'editor',
      avatarColor: randomColor,
      preferences: {
        theme: 'dark',
        autoLayoutOnLoad: true,
        confirmOnSave: false
      }
    };

    this.users.set(key, newUser);
    this.save();
    return this.toPublicProfile(newUser);
  }

  public updateUser(id: string, updates: {
    fullName?: string;
    email?: string;
    role?: 'admin' | 'editor' | 'viewer';
    newPassword?: string;
  }): UserPublicProfile {
    for (const u of this.users.values()) {
      if (u.id === id) {
        if (updates.fullName !== undefined) u.fullName = updates.fullName.trim();
        if (updates.email !== undefined) u.email = updates.email.trim();
        if (updates.role !== undefined) u.role = updates.role;
        if (updates.newPassword && updates.newPassword.trim()) {
          u.passwordHash = hashPassword(updates.newPassword.trim());
        }
        this.save();
        return this.toPublicProfile(u);
      }
    }
    throw new Error(`User with ID "${id}" not found.`);
  }

  public deleteUser(id: string): boolean {
    let targetKey: string | null = null;
    let targetUser: UserAccount | null = null;
    let adminCount = 0;

    for (const [key, u] of this.users.entries()) {
      if (u.role === 'admin') adminCount++;
      if (u.id === id) {
        targetKey = key;
        targetUser = u;
      }
    }

    if (!targetKey || !targetUser) {
      throw new Error(`User with ID "${id}" not found.`);
    }

    if (targetUser.role === 'admin' && adminCount <= 1) {
      throw new Error('Cannot delete the last remaining administrator account.');
    }

    // Invalidate sessions for this user
    for (const [token, uid] of this.sessions.entries()) {
      if (uid === id) {
        this.sessions.delete(token);
      }
    }

    this.users.delete(targetKey);
    this.save();
    return true;
  }

  public changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
    for (const u of this.users.values()) {
      if (u.id === userId) {
        if (u.passwordHash !== hashPassword(currentPassword)) {
          throw new Error('Current password does not match.');
        }
        if (!newPassword || newPassword.length < 3) {
          throw new Error('New password must be at least 3 characters.');
        }
        u.passwordHash = hashPassword(newPassword);
        this.save();
        return true;
      }
    }
    throw new Error('User not found.');
  }

  public updateProfile(userId: string, updates: Partial<UserAccount>): UserPublicProfile | null {
    for (const u of this.users.values()) {
      if (u.id === userId) {
        if (updates.fullName) u.fullName = updates.fullName;
        if (updates.email) u.email = updates.email;
        if (updates.avatarColor) u.avatarColor = updates.avatarColor;
        if (updates.preferences) {
          u.preferences = { ...u.preferences, ...updates.preferences };
        }
        this.save();
        return this.toPublicProfile(u);
      }
    }
    return null;
  }
}
