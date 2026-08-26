'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-context';
import { userManagementService, UserRecord } from '@/services/user-management.service';
import { UserManagementTable } from '@/components/users/user-management-table';
import { CreateUserModal } from '@/components/users/create-user-modal';
import { EditUserModal } from '@/components/users/edit-user-modal';
import {
  Users,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Key,
  Shield,
  Loader2,
  Lock,
} from 'lucide-react';

export default function UsersPage() {
  const { user, isRole, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const isAuthorized = isRole('it_admin', 'admin') || hasPermission('manageUsers');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userManagementService.getUsers();
      setUsers(data);
    } catch (err) {
      console.warn('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadUsers();
    } else {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  const handleEditUser = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setEditModalOpen(true);
  };

  if (!isAuthorized && !isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 font-sans">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Only IT Administrators and authorized System Managers have permission to view and manage user accounts.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = users.filter((u) => u.isActive).length;
  const disabledCount = users.filter((u) => !u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'it_admin' || u.role === 'admin').length;

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">User Management</h1>
              <p className="text-xs text-slate-500">
                Manage system users, accounts, roles and access.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Create User</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL SYSTEM USERS</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{users.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Configured in ERPNext DocType</div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">ACTIVE ACCOUNTS</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-800 tracking-tight">{activeCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium">Enabled for Login & Execution</div>
        </div>

        {/* IT & Admins */}
        <div className="bg-white rounded-2xl border border-purple-200 bg-purple-50/20 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">ADMINISTRATORS</span>
            <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-800 tracking-tight">{adminCount}</div>
          <div className="text-[11px] text-purple-600 font-medium">IT Security & PMO Admins</div>
        </div>

        {/* Disabled Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">DISABLED ACCOUNTS</span>
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Key className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">{disabledCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Login Access Suspended</div>
        </div>
      </div>

      {/* Users Table */}
      <UserManagementTable
        users={users}
        isLoading={isLoading}
        onRefresh={loadUsers}
        onEditUser={handleEditUser}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUser}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={loadUsers}
      />
    </div>
  );
}
