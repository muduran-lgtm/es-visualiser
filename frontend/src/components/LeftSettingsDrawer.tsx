import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Users, ChevronDown, ChevronRight, 
  Plus, Pencil, Trash2, Shield, Sliders, Eye, 
  AlertCircle, RefreshCw, UserCheck, UserX
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { listUsersApi, createUserApi, updateUserApi, deleteUserApi, toggleUserStatusApi } from '../services/auth.js';
import { useTheme } from '../context/ThemeContext.js';
import { PanoptextEyeLogo } from './PanoptextEyeLogo.js';

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
  const [formEnabled, setFormEnabled] = useState(true);
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
    setFormEnabled(true);
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
    setFormEnabled(u.enabled !== false);
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
          enabled: formEnabled,
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
          role: formRole,
          enabled: formEnabled
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

  const handleToggleStatus = async (u: UserProfile) => {
    if (u.id === currentUserId && u.enabled !== false) {
      alert('You cannot disable your own account.');
      return;
    }
    const targetStatus = u.enabled === false ? true : false;
    const actionName = targetStatus ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${actionName} user "${u.fullName}" (@${u.username})?`)) {
      return;
    }

    try {
      await toggleUserStatusApi(u.id, targetStatus);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionName} user`);
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
            <div className="w-8 h-8 rounded-lg bg-[#0D5EAF]/10 border border-[#0D5EAF]/30 flex items-center justify-center shadow-xs shrink-0">
              <PanoptextEyeLogo size={22} color="#0D5EAF" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className={`font-black tracking-wide text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Panoptext</span>
                <span className="text-[#0D5EAF] font-bold text-sm">.Visualiser</span>
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

                    <div>
                      <label className={`text-[10px] uppercase font-semibold block mb-1 ${isDarkTheme ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Account Status
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormEnabled(!formEnabled)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          formEnabled
                            ? isDarkTheme
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : isDarkTheme
                              ? 'bg-rose-950/30 border-rose-800/60 text-rose-400'
                              : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {formEnabled ? <UserCheck size={14} /> : <UserX size={14} />}
                          <span>{formEnabled ? 'Enabled (User can log in)' : 'Disabled (Login blocked)'}</span>
                        </div>
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                          formEnabled ? 'bg-emerald-600' : isDarkTheme ? 'bg-neutral-700' : 'bg-slate-300'
                        }`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            formEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </div>
                      </button>
                    </div>

                    <div className={`flex justify-end gap-2 pt-2 border-t ${isDarkTheme ? 'border-[#2d3139]' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className={`px-3 py-1 text-xs rounded cursor-pointer ${isDarkTheme ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSaving}
                        className="px-4 py-1.5 bg-[#00bfb3] hover:bg-[#00a89d] text-black font-bold text-xs rounded transition-colors shadow disabled:opacity-50 cursor-pointer"
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
                    const isEnabled = u.enabled !== false;
                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          !isEnabled ? 'opacity-70 border-dashed' : ''
                        } ${
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
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow relative ${
                              !isEnabled ? 'grayscale opacity-75' : ''
                            }`}
                            style={{ backgroundColor: u.avatarColor || '#00bfb3' }}
                          >
                            {u.fullName.charAt(0).toUpperCase()}
                            {/* Status Indicator Dot */}
                            <span 
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ${
                                isDarkTheme ? 'ring-[#1a1c24]' : 'ring-white'
                              } ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              title={isEnabled ? 'Account Enabled' : 'Account Disabled'}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold truncate ${!isEnabled ? 'line-through opacity-75' : ''} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
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
                              {/* Status Badge */}
                              {isEnabled ? (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border ${
                                  isDarkTheme ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                }`}>
                                  <UserCheck size={9} /> Active
                                </span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border ${
                                  isDarkTheme ? 'bg-rose-950/60 text-rose-400 border-rose-800/50' : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}>
                                  <UserX size={9} /> Disabled
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 truncate ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                              @{u.username} {u.email && `• ${u.email}`}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf && isEnabled}
                            className={`p-1.5 rounded transition-colors ${
                              isSelf && isEnabled
                                ? isDarkTheme ? 'text-neutral-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                                : isEnabled
                                  ? isDarkTheme ? 'text-neutral-400 hover:text-amber-400 hover:bg-amber-950/40 cursor-pointer' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer'
                                  : isDarkTheme ? 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-950/40 cursor-pointer' : 'text-rose-600 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                            }`}
                            title={
                              isSelf && isEnabled
                                ? 'Cannot disable your own account'
                                : isEnabled
                                  ? 'Disable User Account'
                                  : 'Enable User Account'
                            }
                          >
                            {isEnabled ? <UserX size={13} /> : <UserCheck size={13} className="text-emerald-500" />}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditForm(u)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              isDarkTheme 
                                ? 'text-neutral-400 hover:text-white hover:bg-[#252834]' 
                                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Edit User"
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded transition-colors ${
                              isSelf
                                ? isDarkTheme ? 'text-neutral-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                                : isDarkTheme ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
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
