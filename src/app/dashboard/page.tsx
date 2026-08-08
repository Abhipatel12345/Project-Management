'use client';

import React from 'react';
import Link from 'next/link';
import dashboardService, {
  DashboardProjectItem,
  DashboardActivityItem,
} from '@/services/dashboard.service';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { useAuth } from '@/providers/auth-context';
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Car,
  AlertCircle,
  User,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardSummary();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Failed to Load ERPNext Data</h2>
          <p className="text-xs text-slate-400">
            {error?.message || 'Unable to retrieve projects, tasks, and issues from ERPNext server.'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry ERPNext Connection
        </button>
      </div>
    );
  }

  const projects = data?.projects || [];
  const tasks = data?.tasks || [];
  const issues = data?.issues || [];
  const activities = data?.recentActivities || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Logged User Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Car className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {user?.fullName || 'Automotive Engineer'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>Logged in as: <strong className="text-slate-200">{user?.email}</strong></span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Session Authenticated
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh ERPNext Data"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
          <Link
            href="/connection-test"
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 transition flex items-center gap-1.5 shadow-sm"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400" /> Connection Test
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid - Pure ERPNext Live Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Projects Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Programs / Projects</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {data?.totalProjects ?? 0}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-medium">
              {data?.activeProjects ?? 0} Active Status
            </span>
            <Link href="/projects" className="text-slate-500 group-hover:text-cyan-400 flex items-center gap-0.5 transition">
              Projects <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Tasks</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {data?.totalTasks ?? 0}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-amber-400 font-medium">
              {data?.pendingTasks ?? 0} In Progress
            </span>
            <Link href="/tasks" className="text-slate-500 group-hover:text-cyan-400 flex items-center gap-0.5 transition">
              Task Board <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Issues Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Open Issues</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {data?.openIssues ?? 0}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-rose-400 font-medium">
              {data?.criticalIssues ?? 0} Critical Priority
            </span>
            <Link href="/issues" className="text-slate-500 group-hover:text-cyan-400 flex items-center gap-0.5 transition">
              Issues Log <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* User Session Info Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Authenticated Roles</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white truncate max-w-[180px]">
            {user?.roles[0] || 'System User'}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 truncate">{user?.roles.length || 1} Assigned Roles</span>
            <span className="text-emerald-400 font-mono">Verified</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Live Programs Table & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Projects Table Section (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Live ERPNext Projects</h2>
              <p className="text-xs text-slate-400">Queried dynamically from ERPNext Project DocType</p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No Projects in ERPNext"
              description="No Project records were found on your ERPNext instance. Create a Project in ERPNext to view live data."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Project Name / ID</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Progress</th>
                    <th className="pb-3 font-semibold text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projects.slice(0, 8).map((project: DashboardProjectItem) => (
                    <tr key={project.name} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 pr-4 font-medium text-slate-200">
                        <div>{project.project_name || project.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{project.name}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                            project.status === 'In Progress'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : project.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-300'
                          )}
                        >
                          {project.status || 'Open'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Completion</span>
                            <span>{project.percent_complete ?? 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${project.percent_complete ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-mono">
                        {project.expected_end_date || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent ERPNext Activities (1 Col) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" /> ERPNext Audit Log
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Live Logs</span>
          </div>

          {activities.length === 0 ? (
            <EmptyState title="No Recent Activities" description="Audit log is clear or endpoint restricted." />
          ) : (
            <div className="space-y-3">
              {activities.map((act: DashboardActivityItem) => (
                <div
                  key={act.name}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs space-y-1 hover:border-slate-700 transition"
                >
                  <p className="text-slate-200 font-medium leading-tight">{act.subject}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{act.user}</span>
                    <span>{act.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 w-full bg-slate-900 rounded-2xl border border-slate-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-900 rounded-2xl border border-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-slate-900 rounded-2xl border border-slate-800" />
        <div className="h-72 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
      <div className="text-slate-400 font-medium text-sm">{title}</div>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}
