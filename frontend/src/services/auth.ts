import { UserProfile } from '../types.js';

const TOKEN_KEY = 'panoptext_auth_token';
const USER_KEY = 'panoptext_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginApi(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(data.error || 'Authentication failed');
  }

  const data = await res.json();
  saveSession(data.token, data.user);
  return data;
}

export async function fetchCurrentUserApi(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      clearSession();
      return null;
    }

    const data = await res.json();
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
  }
  clearSession();
}

export async function updateProfileApi(updates: Partial<UserProfile>): Promise<UserProfile> {
  const token = getStoredToken();
  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    throw new Error('Failed to update profile');
  }

  const data = await res.json();
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const token = getStoredToken();
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to change password');
  }
  return data;
}

export async function listUsersApi(): Promise<UserProfile[]> {
  const token = getStoredToken();
  const res = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token || ''}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to load user list');
  }

  const data = await res.json();
  return data.users || [];
}

export async function createUserApi(userData: {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}): Promise<UserProfile> {
  const token = getStoredToken();
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(userData)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create user');
  }
  return data.user;
}

export async function updateUserApi(id: string, updates: {
  fullName?: string;
  email?: string;
  role?: 'admin' | 'editor' | 'viewer';
  newPassword?: string;
}): Promise<UserProfile> {
  const token = getStoredToken();
  const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update user');
  }
  return data.user;
}

export async function deleteUserApi(id: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token || ''}`
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(data.error || 'Failed to delete user');
  }
}
