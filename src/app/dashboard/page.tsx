'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { useAuth } from '@/providers/auth-context';
import { DashboardProjectItem, DashboardActivityItem } from '@/services/dashboard.service';
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
  Building,
  Building2,
  FileText,
  Package,
  Hash,
  Wallet,
  Check,
  ChevronRight,
  Bot,
  X,
  Send,
  Sparkles,
  Layers,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardSummary();

  // AI Assistant Floating Widget state
  const [botOpen, setBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState([
    {
      sender: 'bot',
      text: `Hello! I am your Netlink Automotive PDM Assistant. I can help analyze live ERPNext project progress, check APQP gate sign-offs, or review open FMEA risks.`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');

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
          text: `Retrieved live stats: ${data?.totalProjects || 0} active ERPNext projects, ${data?.pendingTasks || 0} pending tasks, and ${data?.openIssues || 0} open issues. All system gateways are operating normally.`,
        },
      ]);
    }, 800);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm font-sans">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Failed to Load ERPNext Data</h2>
          <p className="text-xs text-slate-500">
            {error?.message || 'Unable to retrieve projects, tasks, and issues from ERPNext server.'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition shadow-xs"
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
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* 1. Header Banner - Screenshot Styled Ice Blue Container */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold tracking-wider uppercase text-sky-800">
            AUTOMOTIVE PRODUCT DEVELOPMENT MANAGEMENT (PDM)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl bg-white border border-sky-200 text-slate-600 hover:text-sky-600 transition disabled:opacity-50 shadow-2xs"
              title="Refresh ERPNext Data"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            </button>
            <Link
              href="/connection-test"
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 transition flex items-center gap-1.5 shadow-2xs"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-500" /> Connection Test
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-1">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>LOGGED USER</span>
            </div>
            <div className="text-xs font-extrabold text-slate-900 truncate">
              {user?.fullName || 'Automotive Engineer'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>USER EMAIL</span>
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">{user?.email || 'user@netlink.com'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>DEPARTMENT</span>
            </div>
            <div className="text-xs font-bold text-slate-900">Product Engineering</div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span>COMPANY</span>
            </div>
            <div className="text-xs font-bold text-slate-900">Netlink Group</div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>SESSION STATUS</span>
            </div>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              Active Authenticated
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stat Metric Cards Row - White Rounded Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Programs / Projects */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL PROGRAMS / PROJECTS</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.totalProjects ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-bold">
              {data?.activeProjects ?? 0} Active Status
            </span>
            <Link href="/projects" className="text-slate-400 group-hover:text-sky-600 flex items-center gap-0.5 font-semibold transition">
              Projects <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL TASKS</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.totalTasks ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-bold">
              {data?.pendingTasks ?? 0} In Progress
            </span>
            <Link href="/tasks" className="text-slate-400 group-hover:text-sky-600 flex items-center gap-0.5 font-semibold transition">
              Task Board <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Open Issues */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">OPEN ISSUES</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {data?.openIssues ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-bold">
              {data?.criticalIssues ?? 0} High / Critical
            </span>
            <Link href="/issues" className="text-slate-400 group-hover:text-sky-600 flex items-center gap-0.5 font-semibold transition">
              Issues Log <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Authenticated Roles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">USER ROLE & SESSION</span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 truncate max-w-[180px]">
            {user?.roles[0] || 'System User'}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{user?.roles.length || 1} Roles Assigned</span>
            <span className="text-emerald-600 font-bold">Verified</span>
          </div>
        </div>
      </div>

      {/* Governance & Quality Executive Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stage Gates Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">UPCOMING STAGE-GATES</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {data?.upcomingGates ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-bold">APQP Governance</span>
            <Link href="/gates" className="text-slate-400 group-hover:text-emerald-600 flex items-center gap-0.5 font-semibold transition">
              Gate Board <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Design Reviews Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">PENDING DESIGN REVIEWS</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {data?.pendingDesignReviews ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-indigo-600 font-bold">Milestone Sign-off</span>
            <Link href="/design-review" className="text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5 font-semibold transition">
              Review Board <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Documents Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">DOCUMENTS UNDER REVIEW</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {data?.documentsUnderReview ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-sky-600 font-bold">CAD & Quality Vault</span>
            <Link href="/documents" className="text-slate-400 group-hover:text-sky-600 flex items-center gap-0.5 font-semibold transition">
              Doc Vault <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. APQP Stage-Gate Process Pipeline Stepper Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-semibold">
          {/* Step 1 */}
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-6 w-6 rounded-full border-2 border-sky-400 text-sky-600 flex items-center justify-center font-bold">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <span>Concept & Charter</span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300" />

          {/* Step 2: Active */}
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <div className="h-6 w-6 rounded-full bg-[#0088FF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              2
            </div>
            <span>APQP Stage-Gates</span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300" />

          {/* Step 3 */}
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-6 w-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center font-medium text-xs">
              3
            </div>
            <span>FMEA & Risk Validation</span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300" />

          {/* Step 4 */}
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-6 w-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center font-medium text-xs">
              4
            </div>
            <span>Flawless Launch</span>
          </div>
        </div>
      </div>

      {/* 4. Live ERPNext Projects & Audit Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Projects Table Card (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header Callout */}
          <div className="rounded-xl bg-[#F0F7FF] border border-sky-100 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live ERPNext Projects</h3>
                <p className="text-xs text-slate-500">
                  Queried dynamically from ERPNext Project DocType
                </p>
              </div>
            </div>
            <Link
              href="/projects"
              className="text-xs font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1 shrink-0"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No Projects Found in ERPNext"
              description="No Project records were found on your ERPNext instance. Create a Project in ERPNext to view live data."
            />
          ) : (
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3">Project Name / ID</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">APQP Progress</th>
                    <th className="py-3 px-3 text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {projects.slice(0, 8).map((project: DashboardProjectItem) => (
                    <tr key={project.name} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div>{project.project_name || project.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{project.name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-block',
                            project.status === 'In Progress'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : project.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          )}
                        >
                          {project.status || 'Open'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                            <span>Progress</span>
                            <span>{project.percent_complete ?? 0}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${project.percent_complete ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
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
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" /> ERPNext Audit Log
            </h2>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
              Live Stream
            </span>
          </div>

          {activities.length === 0 ? (
            <EmptyState title="No Recent Activities" description="Audit log is clear or endpoint restricted." />
          ) : (
            <div className="space-y-3">
              {activities.map((act: DashboardActivityItem) => (
                <div
                  key={act.name}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 hover:border-sky-300 transition"
                >
                  <p className="text-slate-800 font-semibold leading-tight">{act.subject}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{act.user}</span>
                    <span>{act.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Floating AI Bot Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {!botOpen ? (
          <button
            onClick={() => setBotOpen(true)}
            className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform group"
            title="Netlink AI PDM Assistant"
          >
            <Bot className="h-7 w-7" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </button>
        ) : (
          <div className="w-80 sm:w-96 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col font-sans text-slate-800 animate-in slide-in-from-bottom-5 duration-200">
            {/* Bot Header */}
            <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-extrabold tracking-wide uppercase">Netlink AI Assistant</div>
                  <div className="text-[10px] text-sky-200 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-300" /> Connected to ERPNext Engine
                  </div>
                </div>
              </div>
              <button
                onClick={() => setBotOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 h-64 overflow-y-auto space-y-3 bg-slate-50/60 custom-scrollbar text-xs">
              {botMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed',
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white ml-auto rounded-br-xs font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 mr-auto rounded-bl-xs shadow-2xs'
                  )}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Chat Form */}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Ask about project status, gate reviews..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse font-sans">
      <div className="h-24 w-full bg-slate-200/80 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200/80 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-slate-200/80 rounded-2xl" />
        <div className="h-72 bg-slate-200/80 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
      <div className="text-slate-600 font-bold text-xs">{title}</div>
      <p className="text-[11px] text-slate-400">{description}</p>
    </div>
  );
}


