import React from 'react';
import { Project } from '@/types/project.types';
import { DesignReviewSummary } from '@/types/design-review.types';
import {
  ClipboardList,
  FolderKanban,
  ChevronDown,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface DesignReviewHeaderSummaryProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  summary: DesignReviewSummary;
  onCreateClick: () => void;
  onRefreshClick: () => void;
  isFetching?: boolean;
}

export function DesignReviewHeaderSummary({
  projects,
  selectedProjectId,
  onSelectProject,
  summary,
  onCreateClick,
  onRefreshClick,
  isFetching,
}: DesignReviewHeaderSummaryProps) {
  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">
              Governance & Quality Phase 2
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Engineering Sign-off</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Design Review & Milestone Approvals
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage engineering design reviews, milestone approvals, review findings, and corrective action items.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Project Selector */}
          <div className="relative min-w-[240px]">
            <div className="absolute left-3.5 top-3 text-indigo-600">
              <FolderKanban className="h-4 w-4" />
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer appearance-none shadow-2xs"
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

          {/* Create Design Review Button */}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Design Review</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
            <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
            Total Reviews
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalReviews}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-blue-700 font-bold uppercase flex items-center justify-center gap-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            Planned
          </div>
          <div className="text-2xl font-black text-blue-600">{summary.plannedReviews}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            In Progress
          </div>
          <div className="text-2xl font-black text-amber-600">{summary.inProgressReviews}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Approved
          </div>
          <div className="text-2xl font-black text-emerald-600">{summary.approvedReviews}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-rose-700 font-bold uppercase flex items-center justify-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Rejected
          </div>
          <div className="text-2xl font-black text-rose-600">{summary.rejectedReviews}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-purple-700 font-bold uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-purple-500" />
            Open Findings
          </div>
          <div className="text-2xl font-black text-purple-600">{summary.openFindings}</div>
        </div>
      </div>
    </div>
  );
}
