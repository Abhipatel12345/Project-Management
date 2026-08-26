'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { userManagementService, UserRecord } from '@/services/user-management.service';
import { materialRequestService } from '@/services/material-request.service';
import { MaterialRequestItem } from '@/types/material-request.types';
import { auditService, AuditLogEntry } from '@/services/audit.service';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useIssues } from '@/hooks/use-issues';
import { Task } from '@/types/task.types';
import { Issue } from '@/types/issue.types';
import { Project } from '@/types/project.types';
import { Gate } from '@/types/gate.types';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';
import { TaskFormValues } from '@/lib/validations/task.schema';
import { BackButton } from '@/components/shared/back-button';
import { ImportExportControls } from '@/components/shared/import-export-controls';
import { useToast } from '@/providers/toast-context';
import { GateReviewerDashboard } from '@/components/dashboard/gate-reviewer-dashboard';
import { CreateUserModal } from '@/components/users/create-user-modal';
import { getUserRasicRole } from '@/utils/user-matcher';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  Building2,
  FileText,
  Plus,
  CheckCircle2,
  Send,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  Eye,
  Edit2,
  Calendar,
  Layers,
  Bot,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  Boxes,
  UserPlus,
  UserCheck,
  UserX,
  Lock,
  Package,
  ShieldAlert,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/utils/cn';

// MAIN ROLE-BASED DASHBOARD ROUTER
export default function DashboardRouter() {
  const { role, hasPermission } = useAuth();

  // 1. IT Admin / PDM User Administrator
  if (role === 'it_admin' || (hasPermission('manageUsers') && !hasPermission('manageProjects'))) {
    return <ITAdminDashboard />;
  }

  // 2. PDM Administrator (PMO / Business System Admin)
  if (role === 'admin') {
    return <PDMAdminDashboard />;
  }

  // 3. Project Manager (e.g. Sarah Jenkins)
  if (role === 'projectmanager') {
    return <ProjectManagerDashboard />;
  }

  // 4. Dedicated Gate Reviewer (System Role: Gate Reviewer)
  if (role === 'gate_reviewer') {
    return <GateReviewerDashboard />;
  }

  // 5. Warehouse User
  if (role === 'warehouse_user') {
    return <WarehouseDashboard />;
  }

  // 6. Team Member / Projects User / Design Engineer (e.g. Yash)
  return <TeamMemberDashboard />;
}

// ----------------------------------------------------------------------
// 1. IT ADMIN / PDM USER ADMINISTRATOR DASHBOARD
// ----------------------------------------------------------------------
function ITAdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const loadLocalData = async () => {
    const list = await userManagementService.getUsers();
    setUsersList(list);
    setAuditLogs(auditService.getLogs().filter((l) => l.entityType === 'User' || l.action.toLowerCase().includes('user')));
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  const activeUsersCount = usersList.filter((u) => u.isActive).length;
  const inactiveUsersCount = usersList.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* IT Admin Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {user?.fullName || 'IT Admin'}
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                {user?.roleLabel || 'IT Admin'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              User & Access Administration Desk • ERPNext Account Security Engine
            </p>
          </div>

          <button
            onClick={() => setAddUserModalOpen(true)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Create User</span>
          </button>
        </div>

        {/* Identity Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" /> Logged Account
            </div>
            <div className="font-bold text-slate-900 truncate">{user?.username}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" /> Email
            </div>
            <div className="font-bold text-slate-700 truncate">{user?.email}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-sky-600" /> Security Authority
            </div>
            <div className="font-bold text-sky-700">IT User & Account Administration</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" /> Session Status
            </div>
            <div className="font-bold text-emerald-600">Active Token Session</div>
          </div>
        </div>
      </div>

      {/* IT Admin User Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1 hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL SYSTEM USERS</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{usersList.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Registered ERPNext User Accounts</div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs space-y-1 hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">ACTIVE USERS</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">{activeUsersCount}</div>
          <div className="text-[11px] text-emerald-600 font-bold">Authorized for system access</div>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 bg-rose-50/20 p-4 shadow-xs space-y-1 hover:border-rose-300 transition">
          <div className="flex items-center justify-between text-xs text-rose-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">INACTIVE USERS</span>
            <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 tracking-tight">{inactiveUsersCount}</div>
          <div className="text-[11px] text-rose-600 font-bold">Disabled / Locked accounts</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1 hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">USER AUDIT EVENTS</span>
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{auditLogs.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Logged user security actions</div>
        </div>
      </div>

      {/* IT Admin Quick Actions Bar */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Settings className="h-4 w-4 text-sky-600" /> IT Admin Quick Actions
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setAddUserModalOpen(true)}
            className="p-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-left transition shadow-xs space-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between font-extrabold text-xs">
              <span>+ Add User</span>
              <UserPlus className="h-4 w-4" />
            </div>
            <p className="text-[11px] text-sky-100">Create a new user account with employee ID & role.</p>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('user-table-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-left transition shadow-xs space-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between font-extrabold text-xs">
              <span>User Management</span>
              <Users className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-[11px] text-slate-500">View user directory and toggle account status.</p>
          </button>

          <Link
            href="/connection-test"
            className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-left transition shadow-xs space-y-1 block"
          >
            <div className="flex items-center justify-between font-extrabold text-xs">
              <span>Manage Access</span>
              <Activity className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-[11px] text-slate-500">Test ERPNext API connection & role permissions.</p>
          </Link>
        </div>
      </div>

      {/* Registered Users Management Table */}
      <div id="user-table-section" className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 font-sans text-slate-800 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-sky-600" /> System User Directory ({usersList.length})
          </h3>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email / ID</th>
                <th className="py-3 px-4">Function</th>
                <th className="py-3 px-4">Assigned PDM Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usersList.map((u) => (
                <tr key={u.email} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{u.email} ({u.employeeId || 'N/A'})</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{u.functionName || u.department}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {u.roleLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                        <UserCheck className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                        <UserX className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={async () => {
                        await userManagementService.toggleUserStatus(u.email, u.isActive);
                        await loadLocalData();
                        showToast(`User status toggled for ${u.fullName}!`, 'info');
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                    >
                      Toggle Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent User Activity Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 font-sans">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" /> Recent User Activity & Security Logs
          </h3>
        </div>
        {auditLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No user security activity recorded yet.</div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-sky-600">{log.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-700 font-medium">{log.details}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <span>By: {log.user}</span>
                  <span className="font-mono">{log.entityId}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create User Modal (Unified Single Source of Truth) */}
      <CreateUserModal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onSuccess={loadLocalData}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. PDM ADMINISTRATOR DASHBOARD (PMO / Business System Admin - NO user creation)
// ----------------------------------------------------------------------
function PDMAdminDashboard() {
  const { user } = useAuth();
  const { data, refetch, isFetching } = useDashboardSummary();

  const [matRequests] = useState<MaterialRequestItem[]>(() => materialRequestService.getRequests());
  const [auditLogs] = useState<AuditLogEntry[]>(() => auditService.getLogs());

  const projects = data?.projects || [];

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* Session Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {user?.fullName || 'PDM Administrator'}
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                {user?.roleLabel || 'PDM Administrator'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Product Development System Administration & PMO Governance • Integrated ERPNext Engine
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
            </button>
            <Link
              href="/projects"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <FolderKanban className="h-3.5 w-3.5" /> Project Portfolio
            </Link>
          </div>
        </div>

        {/* Identity Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-slate-200 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" /> Logged Account
            </div>
            <div className="font-bold text-slate-900 truncate">{user?.username}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" /> Email
            </div>
            <div className="font-bold text-slate-700 truncate">{user?.email}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-400" /> Department / Function
            </div>
            <div className="font-bold text-slate-700">{user?.department || 'PMO / Engineering'}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-rose-600" /> Role Authority
            </div>
            <div className="font-bold text-rose-700">PDM Business System Admin</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" /> Session Security
            </div>
            <div className="font-bold text-sky-700">Isolated Cookie Active</div>
          </div>
        </div>
      </div>

      {/* PDM Business System Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">PROGRAMS & PROJECTS</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.totalProjects ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-bold">{data?.activeProjects ?? 0} Active</span>
            <Link href="/projects" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Projects <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">EXECUTION TASKS</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.totalTasks ?? 20}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-bold">{data?.pendingTasks ?? 15} Pending</span>
            <Link href="/tasks" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Task Board <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">OPEN ISSUES</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.openIssues ?? 20}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-bold">{data?.criticalIssues ?? 5} High/Critical</span>
            <Link href="/issues" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Issues Log <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">MATERIAL REQUISITIONS</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {matRequests.length}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-sky-600 font-bold">
              {matRequests.filter((r) => r.status === 'ISSUED').length} Issued
            </span>
            <Link href="/warehouse" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Requisitions <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ERPNext Projects Table & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">ERPNext Product Development Projects</h3>
                <p className="text-xs text-slate-500">System-wide active programs & projects</p>
              </div>
            </div>
            <Link href="/projects" className="text-xs font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1">
              All Projects <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Project Name / Code</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Completion %</th>
                  <th className="py-3 px-3 text-right">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.slice(0, 8).map((project) => (
                  <tr key={project.name} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{project.project_name || project.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{project.name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        {project.status || 'Open'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {project.percent_complete ?? 0}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                      {project.expected_end_date || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" /> PDM Business Audit Log
            </h3>
          </div>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-sky-600">{log.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-700 font-medium">{log.details}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <span>By: {log.user}</span>
                  <span className="font-mono">{log.entityId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. PROJECT MANAGER DASHBOARD
// ----------------------------------------------------------------------
function ProjectManagerDashboard() {
  const { user } = useAuth();
  const { data, refetch, isFetching } = useDashboardSummary();
  const [matRequests] = useState<MaterialRequestItem[]>(() => materialRequestService.getRequests());
  const [auditLogs] = useState<AuditLogEntry[]>(() => auditService.getLogs());

  const projects = data?.projects || [];

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* Session Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {user?.fullName || 'Project Manager Workspace'}
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                {user?.roleLabel || 'Project Manager'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Executive Project Portfolio Management & Governance • Integrated ERPNext Engine
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
            </button>
            <Link
              href="/projects"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <FolderKanban className="h-3.5 w-3.5" /> Managed Projects
            </Link>
          </div>
        </div>

        {/* Identity Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-slate-200 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" /> Logged Account
            </div>
            <div className="font-bold text-slate-900 truncate">{user?.username}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" /> Email
            </div>
            <div className="font-bold text-slate-700 truncate">{user?.email}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-400" /> Department / Function
            </div>
            <div className="font-bold text-slate-700">{user?.department || 'Program Management'}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-sky-600" /> Role Authority
            </div>
            <div className="font-bold text-sky-700">Project Portfolio Authority</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" /> Session Security
            </div>
            <div className="font-bold text-emerald-600">Isolated Cookie Active</div>
          </div>
        </div>
      </div>

      {/* APQP Executive Gate Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">APQP Stage-Gate Execution & Readiness Desk</h2>
          <p className="text-xs text-slate-500">Monitor Gate deliverables, KGD criteria readiness, baseline schedules, and team assignments.</p>
        </div>
        <Link
          href="/gates/review"
          className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-xs"
        >
          <Lock className="h-4 w-4" /> Open Gate Review Desk <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Program Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">MANAGED PROJECTS</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.totalProjects ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-bold">{data?.activeProjects ?? 0} Active</span>
            <Link href="/projects" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Projects <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">PROJECT TASKS</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.totalTasks ?? 20}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-bold">{data?.pendingTasks ?? 15} Pending Review</span>
            <Link href="/tasks" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Task Engine <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">PROJECT ISSUES</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.openIssues ?? 20}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-bold">{data?.criticalIssues ?? 5} High/Critical</span>
            <Link href="/tasks?tab=issues" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Task Issues <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">MATERIAL REQUESTS</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {matRequests.length}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-sky-600 font-bold">
              {matRequests.filter((r) => r.status === 'ISSUED').length} Issued
            </span>
            <Link href="/warehouse" className="text-slate-400 group-hover:text-sky-600 font-semibold flex items-center gap-0.5">
              Requisitions <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Managed Projects Overview Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Managed ERPNext Projects Portfolio</h3>
                <p className="text-xs text-slate-500">Overview of active projects under PM direction</p>
              </div>
            </div>
            <Link href="/projects" className="text-xs font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1">
              All Projects <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Project Name / Code</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Completion %</th>
                  <th className="py-3 px-3 text-right">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.slice(0, 8).map((project) => (
                  <tr key={project.name} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <Link href={`/projects/${encodeURIComponent(project.name)}`} className="hover:text-sky-600">
                        <div>{project.project_name || project.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{project.name}</div>
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        {project.status || 'Open'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {project.percent_complete ?? 0}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                      {project.expected_end_date || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" /> PM Governance Audit Log
            </h3>
          </div>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {auditLogs.slice(0, 7).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-sky-600">{log.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-700 font-medium">{log.details}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <span>By: {log.user}</span>
                  <span className="font-mono">{log.entityId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ----------------------------------------------------------------------
// 5. WAREHOUSE DASHBOARD
// ----------------------------------------------------------------------
function WarehouseDashboard() {
  const { user } = useAuth();
  const [matRequests] = useState<MaterialRequestItem[]>(() => materialRequestService.getRequests());

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      <div className="rounded-3xl bg-white border border-slate-200 p-6 text-slate-900 space-y-2 shadow-xs">
        <h1 className="text-xl font-bold">{user?.fullName || 'Warehouse User'} — Stock & Requisitions Desk</h1>
        <p className="text-xs text-slate-500">Manage material requisitions, reserve stock, and process component fulfillments.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Pending Requisitions</div>
          <div className="text-2xl font-black text-amber-600">
            {matRequests.filter((r) => r.status === 'REQUESTED' || r.status === 'WAREHOUSE_REVIEW').length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Reserved Stock</div>
          <div className="text-2xl font-black text-sky-600">
            {matRequests.filter((r) => r.status === 'RESERVED').length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Issued Materials</div>
          <div className="text-2xl font-black text-emerald-600">
            {matRequests.filter((r) => r.status === 'ISSUED' || r.status === 'RECEIVED' || r.status === 'CLOSED').length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Stock Shortages</div>
          <div className="text-2xl font-black text-rose-600">
            {matRequests.filter((r) => r.status === 'STOCK_NOT_AVAILABLE' || r.status === 'PROCUREMENT_REQUIRED').length}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Warehouse Requisition Desk</h2>
          <p className="text-xs text-slate-500">Inspect material requests, reserve bin inventory, issue components, or log shortages.</p>
        </div>
        <Link
          href="/warehouse"
          className="px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-2 shadow-xs"
        >
          <Boxes className="h-4 w-4" /> Open Warehouse Depot <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. TEAM MEMBER DASHBOARD (Task Management Dashboard)
// ----------------------------------------------------------------------
function TeamMemberDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Filter Bar State
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Dialog & Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // AI Bot Assistant Floating State
  const [botOpen, setBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState([
    {
      sender: 'bot',
      text: `Hello ${user?.fullName || 'User'}! I am your PDM Task Assistant. How can I assist with your task execution today?`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Fetch Projects for Filter
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  // Fetch Tasks
  const {
    data: taskListData,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
    isFetching: isFetchingTasks,
  } = useTasks({
    project: selectedProject === 'ALL' ? undefined : selectedProject,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    priority: selectedPriority === 'ALL' ? undefined : selectedPriority,
    assigned_to: selectedAssignee === 'ALL' ? undefined : selectedAssignee === 'MY_TASKS' ? user?.email : selectedAssignee,
    pageSize: 100,
  });

  const rawTasks: Task[] = taskListData?.tasks || [];

  // Fetch Issues
  const { data: issueListData, refetch: refetchIssues } = useIssues({
    project: selectedProject === 'ALL' ? undefined : selectedProject,
    pageSize: 100,
  });

  const rawIssues: Issue[] = issueListData?.issues || [];

  // Task Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Apply Date Range Filter on Frontend
  const filteredTasks = useMemo(() => {
    return rawTasks.filter((t) => {
      if (startDate && t.exp_start_date) {
        const taskStart = t.exp_start_date.split(' ')[0].split('T')[0];
        if (taskStart < startDate) return false;
      }
      if (endDate && t.exp_end_date) {
        const taskEnd = t.exp_end_date.split(' ')[0].split('T')[0];
        if (taskEnd > endDate) return false;
      }
      return true;
    });
  }, [rawTasks, startDate, endDate]);

  // Compute Task Issue Map
  const taskIssueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawIssues.forEach((iss) => {
      const tId = iss.task || (iss.description?.match(/\[Task:\s*([^\]]+)\]/)?.[1]);
      if (tId) {
        counts[tId] = (counts[tId] || 0) + 1;
      }
    });
    return counts;
  }, [rawIssues]);

  // Current Date Benchmarks
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  // 8 Dynamic Summary Tiles Calculations
  const metrics = useMemo(() => {
    const userEmail = user?.email?.toLowerCase() || '';
    const userName = user?.fullName?.toLowerCase() || '';

    const myTasks = filteredTasks.filter((t) => {
      const assigned = (t.assigned_to || t.assigned_employee_name || '').toLowerCase();
      const isAssigned = (userEmail && assigned.includes(userEmail)) || (userName && assigned.includes(userName));
      const hasRasic = !!getUserRasicRole(t, user);
      return isAssigned || hasRasic;
    });

    const openTasks = filteredTasks.filter(
      (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Skipped'
    );

    const inProgressTasks = filteredTasks.filter(
      (t) => t.status === 'Working' || t.status === 'In Progress' || t.status === 'Submitted' || t.status === 'Under Review'
    );

    const completedTasks = filteredTasks.filter((t) => t.status === 'Completed');

    const overdueTasks = filteredTasks.filter((t) => t.is_overdue && t.status !== 'Completed');

    const dueTodayTasks = filteredTasks.filter((t) => {
      if (!t.exp_end_date || t.status === 'Completed') return false;
      const due = t.exp_end_date.split(' ')[0].split('T')[0];
      return due === todayStr;
    });

    const dueThisWeekTasks = filteredTasks.filter((t) => {
      if (!t.exp_end_date || t.status === 'Completed') return false;
      const due = t.exp_end_date.split(' ')[0].split('T')[0];
      return due >= todayStr && due <= nextWeekStr;
    });

    return {
      totalTasks: filteredTasks.length,
      myTasksCount: myTasks.length,
      openTasksCount: openTasks.length,
      inProgressCount: inProgressTasks.length,
      completedCount: completedTasks.length,
      overdueCount: overdueTasks.length,
      dueTodayCount: dueTodayTasks.length,
      dueThisWeekCount: dueThisWeekTasks.length,
    };
  }, [filteredTasks, user, todayStr, nextWeekStr]);

  // Tasks by Status Breakdown
  const tasksByStatus = useMemo(() => {
    const map: Record<string, number> = {
      Open: 0,
      'In Progress': 0,
      Submitted: 0,
      Completed: 0,
      Skipped: 0,
    };
    filteredTasks.forEach((t) => {
      if (t.status === 'Completed') map.Completed += 1;
      else if (t.status === 'Submitted' || t.status === 'Under Review' || t.status === 'Pending Review') map.Submitted += 1;
      else if (t.status === 'Working' || t.status === 'In Progress') map['In Progress'] += 1;
      else if (t.status === 'Skipped' || t.status === 'Cancelled') map.Skipped += 1;
      else map.Open += 1;
    });

    const total = filteredTasks.length || 1;
    return [
      { name: 'Open', count: map.Open, pct: Math.round((map.Open / total) * 100), color: 'bg-sky-500' },
      { name: 'In Progress', count: map['In Progress'], pct: Math.round((map['In Progress'] / total) * 100), color: 'bg-blue-600' },
      { name: 'Submitted / Review', count: map.Submitted, pct: Math.round((map.Submitted / total) * 100), color: 'bg-amber-500' },
      { name: 'Completed', count: map.Completed, pct: Math.round((map.Completed / total) * 100), color: 'bg-emerald-500' },
      { name: 'Skipped / Cancelled', count: map.Skipped, pct: Math.round((map.Skipped / total) * 100), color: 'bg-slate-400' },
    ];
  }, [filteredTasks]);

  // Tasks by Priority Breakdown (High/Critical, Medium, Low)
  const tasksByPriority = useMemo(() => {
    const map: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    filteredTasks.forEach((t) => {
      const p = t.priority;
      if (p === 'Urgent' || p === 'High' || p === 'Urgent/Critical') map.High += 1;
      else if (p === 'Low') map.Low += 1;
      else map.Medium += 1;
    });

    const total = filteredTasks.length;
    const denominator = total || 1;

    return [
      {
        name: 'High / Critical',
        count: map.High,
        pct: total > 0 ? Math.round((map.High / denominator) * 100) : 0,
        color: 'bg-rose-600',
        hexColor: '#e11d48',
        filterParam: 'High',
      },
      {
        name: 'Medium',
        count: map.Medium,
        pct: total > 0 ? Math.round((map.Medium / denominator) * 100) : 0,
        color: 'bg-amber-500',
        hexColor: '#f59e0b',
        filterParam: 'Medium',
      },
      {
        name: 'Low',
        count: map.Low,
        pct: total > 0 ? Math.round((map.Low / denominator) * 100) : 0,
        color: 'bg-sky-500',
        hexColor: '#0284c7',
        filterParam: 'Low',
      },
    ];
  }, [filteredTasks]);

  // Open Issues Metrics
  const issueMetrics = useMemo(() => {
    const openIss = rawIssues.filter((i) => i.status === 'Open' || i.status === 'Replied' || i.status === 'On Hold');
    const highPri = openIss.filter((i) => i.priority === 'Urgent/Critical' || i.priority === 'High');
    const dueToday = openIss.filter((i) => i.creation?.split(' ')[0] === todayStr);

    return {
      openCount: openIss.length,
      highPriCount: highPri.length,
      dueTodayCount: dueToday.length,
    };
  }, [rawIssues, todayStr]);

  // Unique Assignees for Filter
  const uniqueAssignees = useMemo(() => {
    const set = new Set<string>();
    rawTasks.forEach((t) => {
      if (t.assigned_employee_name) set.add(t.assigned_employee_name);
      else if (t.assigned_to) set.add(t.assigned_to);
    });
    return Array.from(set);
  }, [rawTasks]);

  // Clear Filters Handler
  const handleClearFilters = () => {
    setSelectedProject('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedAssignee('ALL');
    setStartDate('');
    setEndDate('');
  };

  // Handlers for Task Creation & Edit
  const handleCreateSubmit = async (values: TaskFormValues) => {
    try {
      await createTaskMutation.mutateAsync({
        subject: values.subject,
        project: values.project,
        status: values.status,
        priority: values.priority,
        exp_start_date: values.exp_start_date,
        exp_end_date: values.exp_end_date,
        expected_time: values.expected_time,
        progress: values.progress,
        description: values.description,
        assigned_to: values.assigned_to,
        parent_task: values.parent_task,
        depends_on: values.depends_on,
        rasic: {
          responsible: values.rasic_responsible,
          accountable: values.rasic_accountable,
          support: values.rasic_support,
          consulted: values.rasic_consulted,
          informed: values.rasic_informed,
        },
      });
      showToast('Task created successfully in ERPNext!', 'success');
      setIsCreateOpen(false);
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task in ERPNext', 'error');
    }
  };

  const handleEditSubmit = async (values: TaskFormValues) => {
    if (!editingTask) return;
    try {
      await updateTaskMutation.mutateAsync({
        name: editingTask.name,
        data: {
          subject: values.subject,
          project: values.project,
          status: values.status,
          priority: values.priority,
          exp_start_date: values.exp_start_date,
          exp_end_date: values.exp_end_date,
          expected_time: values.expected_time,
          progress: values.progress,
          description: values.description,
          assigned_to: values.assigned_to,
          parent_task: values.parent_task,
          depends_on: values.depends_on,
          rasic: {
            responsible: values.rasic_responsible,
            accountable: values.rasic_accountable,
            support: values.rasic_support,
            consulted: values.rasic_consulted,
            informed: values.rasic_informed,
          },
        },
      });
      showToast(`Task ${editingTask.name} updated in ERPNext!`, 'success');
      setEditingTask(null);
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    try {
      await deleteTaskMutation.mutateAsync(deletingTask.name);
      showToast(`Task ${deletingTask.name} deleted!`, 'success');
      setDeletingTask(null);
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setBotMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      setBotMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Task Status Summary for ${user?.fullName || 'User'}: ${metrics.myTasksCount} tasks assigned, ${metrics.overdueCount} overdue, ${metrics.dueTodayCount} due today. Need assistance with task submission or issue logging?`,
        },
      ]);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {user?.fullName || 'User Dashboard'}
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                {user?.roleLabel || 'Team Member'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Personalized Task Execution Dashboard • Inteva Enterprise PDM Engine
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <BackButton fallbackUrl="/projects" />
            <ImportExportControls entityName="Dashboard Tasks" dataToExport={filteredTasks} exportFilename="pdm_dashboard_tasks" />
            <button
              onClick={() => {
                refetchTasks();
                refetchIssues();
              }}
              disabled={isFetchingTasks}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetchingTasks && 'animate-spin')} /> Refresh
            </button>
            <Link
              href="/connection-test"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Activity className="h-3.5 w-3.5 text-sky-100" /> API Test
            </Link>
          </div>
        </div>

        {/* Identity Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-slate-200 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" /> Logged Account
            </div>
            <div className="font-bold text-slate-900 truncate">{user?.username}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" /> Email
            </div>
            <div className="font-bold text-slate-700 truncate">{user?.email}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-400" /> Department / Function
            </div>
            <div className="font-bold text-slate-700">{user?.department || 'Engineering'}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Application Role
            </div>
            <div className="font-bold text-emerald-600">{user?.roleLabel}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" /> Authorized Scoping
            </div>
            <div className="font-bold text-sky-700">Scoped to User Access</div>
          </div>
        </div>
      </div>

      {/* 2. Task Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="h-4 w-4 text-sky-600" />
            <span>Task Execution Filters</span>
          </div>

          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Project Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer truncate"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.project_name || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Working">Working / In Progress</option>
              <option value="Submitted">Submitted / Under Review</option>
              <option value="Completed">Completed</option>
              <option value="Skipped">Skipped</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent/Critical">Urgent / Critical</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Assignee</label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer truncate"
            >
              <option value="ALL">All Assignees</option>
              <option value="MY_TASKS">Assigned to Me ({user?.fullName || 'My Tasks'})</option>
              {uniqueAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Task Summary Tiles Grid (8 Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-sans">
        {/* Tile 1 – Total Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 hover:border-sky-300 transition">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{metrics.totalTasks}</div>
          <div className="text-[10px] font-semibold text-slate-500 truncate">All accessible tasks</div>
        </div>

        {/* Tile 2 – My Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-sky-200 bg-sky-50/30 shadow-xs space-y-1 hover:border-sky-400 transition">
          <div className="text-[10px] font-extrabold text-sky-800 uppercase tracking-wider">My Tasks</div>
          <div className="text-2xl font-black text-sky-700 tracking-tight">{metrics.myTasksCount}</div>
          <div className="text-[10px] font-bold text-sky-600 truncate">Assigned to me</div>
        </div>

        {/* Tile 3 – Open Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 hover:border-sky-300 transition">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Tasks</div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{metrics.openTasksCount}</div>
          <div className="text-[10px] font-semibold text-slate-500 truncate">Not completed</div>
        </div>

        {/* Tile 4 – In Progress */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 hover:border-blue-300 transition">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-black text-blue-600 tracking-tight">{metrics.inProgressCount}</div>
          <div className="text-[10px] font-semibold text-slate-500 truncate">Being worked on</div>
        </div>

        {/* Tile 5 – Completed */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1 hover:border-emerald-300 transition">
          <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{metrics.completedCount}</div>
          <div className="text-[10px] font-bold text-emerald-600 truncate">Finished work</div>
        </div>

        {/* Tile 6 – Overdue Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/30 shadow-xs space-y-1 hover:border-rose-300 transition">
          <div className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">Overdue</div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">{metrics.overdueCount}</div>
          <div className="text-[10px] font-bold text-rose-600 truncate">Past target date</div>
        </div>

        {/* Tile 7 – Due Today */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/30 shadow-xs space-y-1 hover:border-amber-300 transition">
          <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Due Today</div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{metrics.dueTodayCount}</div>
          <div className="text-[10px] font-bold text-amber-600 truncate">Tasks due today</div>
        </div>

        {/* Tile 8 – Due This Week */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due This Week</div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metrics.dueThisWeekCount}</div>
          <div className="text-[10px] font-semibold text-slate-500 truncate">Due within 7 days</div>
        </div>
      </div>

      {/* 4. Charts & Breakdown Grid (Status & Priority) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 font-sans">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-sky-600" />
              Tasks by Status
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Click bar to filter</span>
          </div>

          <div className="space-y-3">
            {tasksByStatus.map((item) => (
              <div
                key={item.name}
                onClick={() => router.push(`/tasks?status=${encodeURIComponent(item.name.split(' ')[0])}`)}
                className="space-y-1 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 transition"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 group-hover:text-sky-600 transition flex items-center gap-1.5">
                    {item.name}
                  </span>
                  <div className="font-mono text-xs space-x-2">
                    <span className="font-black text-slate-900">{item.count}</span>
                    <span className="text-slate-400">({item.pct}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', item.color)}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Priority – Donut Chart */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 font-sans flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-600" />
              Tasks by Priority
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Click segment or legend to filter</span>
          </div>

          {metrics.totalTasks === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2 my-auto">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">No Priority Data</h4>
              <p className="text-[11px] text-slate-400">No tasks found for the selected filters.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1 my-auto">
              {/* Donut Chart with Center Total Label */}
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tasksByPriority.map((item) => ({
                        name: item.name,
                        value: item.count,
                        hexColor: item.hexColor,
                        filterParam: item.filterParam,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {tasksByPriority.map((item, index) => (
                        <Cell
                          key={`priority-cell-${index}`}
                          fill={item.hexColor}
                          cursor="pointer"
                          onClick={() => router.push(`/tasks?priority=${encodeURIComponent(item.filterParam)}`)}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, name: any) => [`${value} Tasks`, name]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Total Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {metrics.totalTasks}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Total Tasks
                  </span>
                </div>
              </div>

              {/* Right Side Interactive Legend */}
              <div className="w-full sm:flex-1 space-y-2">
                {tasksByPriority.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => router.push(`/tasks?priority=${encodeURIComponent(item.filterParam)}`)}
                    className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/90 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn('h-3 w-3 rounded-full shrink-0 shadow-2xs', item.color)} />
                      <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition">
                        {item.name}
                      </span>
                    </div>
                    <div className="font-mono text-xs space-x-1.5">
                      <span className="font-black text-slate-900">{item.count}</span>
                      <span className="text-slate-400 font-medium">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Quick Actions & Task Issues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
        {/* Quick Actions Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Task Quick Actions</h3>
              <p className="text-xs text-slate-500 font-medium">Create new task packages or submit completed work.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="p-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-left transition shadow-sm space-y-1 cursor-pointer"
            >
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>+ Create Task</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="text-[11px] text-sky-100">Log a new work package or engineering action in ERPNext.</p>
            </button>

            <Link
              href="/tasks?tab=submission"
              className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-left transition shadow-xs space-y-1 block"
            >
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>Task Submission</span>
                <Send className="h-4 w-4 text-sky-600" />
              </div>
              <p className="text-[11px] text-slate-500">Submit completed task deliverables for review or PM sign-off.</p>
            </Link>
          </div>
        </div>

        {/* Open Issues Against Tasks Card */}
        <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Open Issues (Against Tasks)</h3>
                <p className="text-xs text-slate-500 font-medium">Engineering tickets directly linked to tasks.</p>
              </div>
            </div>

            <Link
              href="/tasks?tab=issues"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition"
            >
              View All Issues
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-extrabold text-rose-700 uppercase block">High Priority</span>
              <span className="text-xl font-black text-rose-800">{issueMetrics.highPriCount}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Open Issues</span>
              <span className="text-xl font-black text-slate-900">{issueMetrics.openCount}</span>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Created Today</span>
              <span className="text-xl font-black text-amber-700">{issueMetrics.dueTodayCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. My Recent Tasks Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-600" />
              My Recent Tasks & Work Packages
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Work packages assigned to you or scoped to your project authority.
            </p>
          </div>

          <Link
            href="/tasks"
            className="text-xs font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1 self-start sm:self-auto"
          >
            Open Full Task Management <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoadingTasks ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-sky-600" />
            <p className="text-xs font-bold">Loading tasks from ERPNext...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Tasks Assigned</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You currently have no tasks assigned to you or matching your current filter selection.
            </p>
            <Link
              href="/tasks"
              className="inline-block px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-500 transition"
            >
              Go to Task Management
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Task ID & Subject</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Issues</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTasks.slice(0, 10).map((t) => {
                  const issueCount = taskIssueCounts[t.name] || 0;
                  return (
                    <tr key={t.name} className="hover:bg-slate-50/80 transition">
                      {/* Subject & ID */}
                      <td className="p-3.5">
                        <div
                          onClick={() => setViewingTask(t)}
                          className="font-bold text-slate-900 hover:text-sky-600 transition cursor-pointer"
                        >
                          {t.subject}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{t.name}</div>
                      </td>

                      {/* Project */}
                      <td className="p-3.5 font-bold text-sky-700">
                        {t.project ? (
                          <Link href={`/projects/${encodeURIComponent(t.project)}`} className="hover:underline">
                            {t.project}
                          </Link>
                        ) : (
                          'Global'
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <TaskStatusBadge status={t.status} />
                      </td>

                      {/* Priority */}
                      <td className="p-3.5">
                        <TaskPriorityBadge priority={t.priority} />
                      </td>

                      {/* Assigned To */}
                      <td className="p-3.5 font-semibold text-slate-800">
                        {t.assigned_employee_name || t.assigned_to || 'Unassigned'}
                      </td>

                      {/* Due Date */}
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {t.exp_end_date ? (
                          <span className={t.is_overdue ? 'text-rose-600 font-bold' : ''}>
                            {t.exp_end_date}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>

                      {/* Progress */}
                      <td className="p-3.5 font-mono font-bold text-sky-600">
                        {t.progress || 0}%
                      </td>

                      {/* Issues */}
                      <td className="p-3.5">
                        {issueCount > 0 ? (
                          <span
                            onClick={() => router.push(`/tasks?tab=issues&search=${encodeURIComponent(t.name)}`)}
                            className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer hover:bg-rose-100 transition"
                          >
                            🔴 {issueCount} Issue{issueCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">0 Issues</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingTask(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                            title="View Task Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingTask(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Create / Edit Dialog */}
      <TaskFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={createTaskMutation.isPending}
      />

      {editingTask && (
        <TaskFormDialog
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditSubmit}
          initialData={editingTask}
          isLoading={updateTaskMutation.isPending}
        />
      )}

      {deletingTask && (
        <TaskDeleteDialog
          isOpen={!!deletingTask}
          onClose={() => setDeletingTask(null)}
          onConfirm={handleDeleteConfirm}
          taskSubject={deletingTask.subject || deletingTask.name}
          isLoading={deleteTaskMutation.isPending}
        />
      )}

      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={(t) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
        />
      )}

      {/* Floating AI Bot Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {!botOpen ? (
          <button
            onClick={() => setBotOpen(true)}
            className="relative h-14 w-14 rounded-full bg-linear-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <Bot className="h-7 w-7" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </button>
        ) : (
          <div className="w-80 sm:w-96 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col font-sans text-slate-800">
            <div className="p-4 bg-sky-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Inteva AI Task Assistant</span>
              </div>
              <button onClick={() => setBotOpen(false)} className="text-white hover:opacity-80 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 h-64 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {botMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded-2xl max-w-[85%] text-xs',
                    msg.sender === 'user' ? 'bg-sky-600 text-white ml-auto' : 'bg-white border border-slate-200 text-slate-800 mr-auto shadow-2xs'
                  )}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Ask assistant..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
              />
              <button type="submit" className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
