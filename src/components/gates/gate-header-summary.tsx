import React from 'react';
import { Project } from '@/types/project.types';
import { GateSummary } from '@/types/gate.types';
import {
  Lock,
  FolderKanban,
  ChevronDown,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

interface GateHeaderSummaryProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  summary: GateSummary;
  onCreateClick: () => void;
  onRefreshClick: () => void;
  isFetching?: boolean;
}

export function GateHeaderSummary({
  projects,
  selectedProjectId,
  onSelectProject,
  summary,
  onCreateClick,
  onRefreshClick,
  isFetching,
}: GateHeaderSummaryProps) {
  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
              APQP Stage-Gate Governance
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Product Lifecycle Sign-off</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gate Management & Stage-Gate Governance
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Enforce APQP stage-gates, required deliverable sign-offs, readiness criteria, and launch governance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Project Selector */}
          <div className="relative min-w-[240px]">
            <div className="absolute left-3.5 top-3 text-emerald-600">
              <FolderKanban className="h-4 w-4" />
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer appearance-none shadow-2xs"
            >
              <option value="ALL">All Automotive Projects</option>
              {projects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.project_name || p.name} ({p.name})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Create Gate Button */}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Stage-Gate</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Total Gates
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalGates}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-blue-700 font-bold uppercase flex items-center justify-center gap-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            Upcoming
          </div>
          <div className="text-2xl font-black text-blue-600">{summary.upcomingGates}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            In Progress
          </div>
          <div className="text-2xl font-black text-amber-600">{summary.inProgressGates}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Completed
          </div>
          <div className="text-2xl font-black text-emerald-600">{summary.completedGates}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-rose-700 font-bold uppercase flex items-center justify-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            Blocked / Failed
          </div>
          <div className="text-2xl font-black text-rose-600">{summary.blockedGates}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-purple-700 font-bold uppercase flex items-center justify-center gap-1">
            <FileCheck className="h-3.5 w-3.5 text-purple-500" />
            Review Needed
          </div>
          <div className="text-2xl font-black text-purple-600">{summary.requiringApprovalGates}</div>
        </div>
      </div>
    </div>
  );
}
