import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Users, ChevronDown, ChevronRight, 
  Plus, Pencil, Trash2, Shield, Sliders, Eye, 
  AlertCircle, RefreshCw
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { listUsersApi, createUserApi, updateUserApi, deleteUserApi } from '../services/auth.js';
import { useTheme } from '../context/ThemeContext.js';

interface LeftSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const LeftSettingsDrawer: React.FC<LeftSettingsDrawerProps> = ({
  isOpen,
  onClose,
  currentUserId
}) => {
  const { isDarkTheme } = useTheme();

  // Navigation state
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'users'>('users');

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add / Edit form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [formSaving, setFormSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listUsersApi();
      setUsers(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingUserId(null);
    setFormUsername('');
    setFormFullName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('editor');
    setIsFormOpen(true);
    setError(null);
  };

  const handleOpenEditForm = (u: UserProfile) => {
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormFullName(u.fullName);
    setFormEmail(u.email);
    setFormPassword(''); // blank means keep existing
    setFormRole(u.role);
    setIsFormOpen(true);
    setError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setError(null);
    try {
      if (editingUserId) {
        // Update
        await updateUserApi(editingUserId, {
          fullName: formFullName,
          email: formEmail,
          role: formRole,
          newPassword: formPassword || undefined
        });
      } else {
        // Create
        if (!formPassword) {
          throw new Error('Password is required for new users.');
        }
        await createUserApi({
          username: formUsername,
          password: formPassword,
          fullName: formFullName,
          email: formEmail,
          role: formRole
        });
      }
      setIsFormOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (u.id === currentUserId) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${u.fullName}" (@${u.username})?`)) {
      return;
    }

    try {
      await deleteUserApi(u.id);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
            isDarkTheme ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
          }`}>
            <Shield size={10} /> Admin
          </span>
        );
      case 'editor':
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
            isDarkTheme ? 'bg-blue-950/80 text-blue-400 border-blue-700/60' : 'bg-blue-50 text-blue-700 border-blue-300'
          }`}>
            <Sliders size={10} /> Engineer
          </span>
        );
      default:
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
            isDarkTheme ? 'bg-purple-950/80 text-purple-400 border-purple-700/60' : 'bg-purple-50 text-purple-700 border-purple-300'
          }`}>
            <Eye size={10} /> Viewer
          </span>
        );
    }
  };

  const inputClass = `w-full text-xs px-2.5 py-1.5 rounded border focus:outline-none focus:border-[#00bfb3] disabled:opacity-50 transition-colors ${
    isDarkTheme 
      ? 'bg-[#121316] text-white border-[#2d3139]' 
      : 'bg-slate-50 text-slate-900 border-slate-300'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-[2px] animate-fadeIn select-none">
      {/* Left Drawer Container */}
      <div className={`w-[540px] max-w-[90vw] h-full border-r flex flex-col shadow-2xl overflow-hidden transition-colors duration-200 ${
        isDarkTheme ? 'bg-[#16171d] border-[#2d3139] text-[#e1e2e6]' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Drawer Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkTheme ? 'bg-[#1b1c23] border-[#2d3139]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00bfb3] to-[#0077cc] flex items-center justify-center font-black text-black text-xs shadow-md">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-black tracking-wide text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Panoptext</span>
                <span className="text-[#00bfb3] font-bold text-sm">.Visualiser</span>
              </div>
              <p className={`text-[11px] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>Settings & Administration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDarkTheme ? 'text-neutral-400 hover:text-white hover:bg-[#252834]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Main Content: Sidebar + Details */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className={`w-48 border-r p-3 flex flex-col justify-between ${
            isDarkTheme ? 'bg-[#14151a] border-[#2d3139]' : 'bg-slate-100/70 border-slate-200'
          }`}>
            <div className="space-y-1">
              {/* Collapsible Settings Menu */}
              <div>
                <button
                  onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isDarkTheme ? 'text-white hover:bg-[#1f212a]' : 'text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings size={14} className="text-[#00bfb3]" />
                    <span>Settings</span>
                  </div>
                  {isSettingsExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {/* Submenu */}
                {isSettingsExpanded && (
                  <div className="mt-1 pl-4 space-y-0.5">
                    <button
                      onClick={() => setActiveSubTab('users')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                        activeSubTab === 'users'
                          ? isDarkTheme
                            ? 'bg-[#00bfb3]/15 text-[#00bfb3] font-semibold border-l-2 border-[#00bfb3]'
                            : 'bg-[#00bfb3]/10 text-[#008b82] font-semibold border-l-2 border-[#00bfb3]'
                          : isDarkTheme
                            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1b1c23]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <Users size={13} />
                      <span>User Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Version */}
            <div className={`text-[11px] px-2 ${isDarkTheme ? 'text-neutral-600' : 'text-slate-400'}`}>
              Panoptext v1.0
            </div>
          </div>

          {/* User Settings / User Management View */}
          <div className={`flex-1 flex flex-col overflow-hidden ${
            isDarkTheme ? 'bg-[#181920]' : 'bg-slate-50'
          }`}>
            {/* Header action bar */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkTheme ? 'bg-[#1d1f27] border-[#2d3139]' : 'bg-white border-slate-200'
            }`}>
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  <Users size={16} className="text-[#00bfb3]" />
                  <span>User Settings</span>
                </h3>
                <p className={`text-[11px] mt-0.5 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Manage platform users, roles, and permissions
                </p>
              </div>

              {!isFormOpen && (
                <button
                  onClick={handleOpenAddForm}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00bfb3] hover:bg-[#00a89d] text-black font-bold text-xs rounded-lg transition-colors shadow"
                >
                  <Plus size={13} />
                  <span>Add User</span>
                </button>
              )}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Add / Edit Form */}
              {isFormOpen ? (
                <div className={`p-4 rounded-xl border shadow-lg animate-fadeIn ${
                  isDarkTheme ? 'bg-[#1f212a] border-[#2d3139]' : 'bg-white border-slate-200'
                }`}>
                  <div className={`flex items-center justify-between pb-3 border-b ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                      {editingUserId ? 'Edit User' : 'Create New User'}
                    </h4>
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className={`text-xs ${isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-3 mt-3">
                    <div>
                      <label className={`text-[10px] uppercase font-semibold block mb-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Username
                      </label>
                      <input
                        type="text"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        disabled={!!editingUserId}
                        required
                        placeholder="john_doe"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={`text-[10px] uppercase font-semibold block mb-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        required
                        placeholder="John Doe"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={`text-[10px] uppercase font-semibold block mb-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="john@example.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={`text-[10px] uppercase font-semibold block mb-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-600'}`}>
                        {editingUserId ? 'New Password (leave blank to keep current)' : 'Password'}
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        required={!editingUserId}
                        placeholder="••••••••"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={`text-[10px] uppercase font-semibold block mb-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Role
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as any)}
                        className={inputClass}
                      >
                        <option value="admin">Administrator (Full Access)</option>
                        <option value="editor">Workflow Engineer (Create & Edit)</option>
                        <option value="viewer">Viewer (Read-Only)</option>
                      </select>
                    </div>

                    <div className={`flex justify-end gap-2 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className={`px-3 py-1 text-xs rounded ${isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSaving}
                        className="px-4 py-1.5 bg-[#00bfb3] hover:bg-[#00a89d] text-black font-bold text-xs rounded transition-colors shadow disabled:opacity-50"
                      >
                        {formSaving ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {/* Users List */}
              <div className="space-y-2.5">
                {loading ? (
                  <div className={`py-8 text-center text-xs flex items-center justify-center gap-2 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                    <RefreshCw size={14} className="animate-spin text-[#00bfb3]" />
                    <span>Loading users...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className={`py-8 text-center text-xs ${isDarkTheme ? 'text-neutral-500' : 'text-slate-400'}`}>
                    No users found.
                  </div>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentUserId;
                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelf 
                            ? isDarkTheme 
                              ? 'bg-[#1e222d] border-[#00bfb3]/60' 
                              : 'bg-teal-50/70 border-[#00bfb3]'
                            : isDarkTheme 
                              ? 'bg-[#1a1c24] border-[#2d3139] hover:border-neutral-600' 
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow"
                            style={{ backgroundColor: u.avatarColor || '#00bfb3' }}
                          >
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold truncate ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                                {u.fullName}
                              </span>
                              {isSelf && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                  isDarkTheme ? 'text-[#00bfb3] bg-[#00bfb3]/10' : 'text-[#008b82] bg-teal-100'
                                }`}>
                                  (You)
                                </span>
                              )}
                              {getRoleBadge(u.role)}
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 truncate ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                              @{u.username} {u.email && `• ${u.email}`}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => handleOpenEditForm(u)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkTheme 
                                ? 'text-neutral-400 hover:text-white hover:bg-[#252834]' 
                                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Edit User"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded transition-colors ${
                              isSelf
                                ? isDarkTheme ? 'text-neutral-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                                : isDarkTheme ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete User'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
