'use client';

import React, { useState } from 'react';
import { UserRecord, userManagementService } from '@/services/user-management.service';
import { useToast } from '@/providers/toast-context';
import {
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Loader2,
  Mail,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface UserManagementTableProps {
  users: UserRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onEditUser: (user: UserRecord) => void;
}

export function UserManagementTable({
  users,
  isLoading,
  onRefresh,
  onEditUser,
}: UserManagementTableProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (u.fullName || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.username || '').toLowerCase().includes(query) ||
      (u.roleLabel || '').toLowerCase().includes(query) ||
      (u.first_name || '').toLowerCase().includes(query) ||
      (u.last_name || '').toLowerCase().includes(query);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'DISABLED' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = async (userRecord: UserRecord) => {
    setTogglingUser(userRecord.username || userRecord.email);
    try {
      await userManagementService.toggleUserStatus(
        userRecord.email || userRecord.username,
        userRecord.isActive
      );
      showToast(
        `User ${userRecord.fullName} ${userRecord.isActive ? 'disabled' : 'enabled'} successfully!`,
        'success'
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setTogglingUser(null);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'it_admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'projectmanager':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'gate_reviewer':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'warehouse_user':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden font-sans">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, username or role..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
            >
              <option value="ALL">All Roles</option>
              <option value="it_admin">IT Admin</option>
              <option value="admin">Administrator</option>
              <option value="projectmanager">Project Manager</option>
              <option value="teammember">Team Member</option>
              <option value="gate_reviewer">Gate Reviewer</option>
              <option value="warehouse_user">Warehouse Manager</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled Only</option>
            </select>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-sky-700 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs self-start md:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4">First Name</th>
              <th className="py-3.5 px-4">Last Name</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Enabled</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 text-sky-600 animate-spin" />
                    <span className="font-semibold text-xs">Loading ERPNext users...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Filter className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">No Users Found</span>
                    <p className="text-xs text-slate-500">
                      No system users matched your search criteria. Try clearing filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isToggling = togglingUser === (u.username || u.email);
                const firstName = u.first_name || u.fullName.split(' ')[0] || '-';
                const lastName = u.last_name || u.fullName.split(' ').slice(1).join(' ') || '-';

                return (
                  <tr
                    key={u.username || u.email}
                    className="hover:bg-sky-50/30 transition-colors group cursor-default"
                  >
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 font-bold text-xs text-white flex items-center justify-center shrink-0 shadow-2xs">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {u.fullName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate block">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-[200px]">
                      {u.email}
                    </td>

                    {/* First Name */}
                    <td className="py-3 px-4 text-slate-700 font-medium">{firstName}</td>

                    {/* Last Name */}
                    <td className="py-3 px-4 text-slate-700 font-medium">{lastName}</td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider',
                          getRoleBadgeStyle(u.role)
                        )}
                      >
                        <Shield className="h-3 w-3" />
                        {u.roleLabel}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          Disabled
                        </span>
                      )}
                    </td>

                    {/* Enabled / Disabled Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isToggling}
                        className={cn(
                          'relative inline-flex items-center h-5 w-9 rounded-full transition-colors cursor-pointer focus:outline-none',
                          u.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                        )}
                        title={u.isActive ? 'Disable User' : 'Enable User'}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                            u.isActive ? 'translate-x-4' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditUser(u)}
                          className="px-2.5 py-1 rounded-lg text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="View / Edit User"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>View/Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> system users
        </span>
        <span className="text-[11px] text-slate-400">ERPNext User Master Integration Active</span>
      </div>
    </div>
  );
}
