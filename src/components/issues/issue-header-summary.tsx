import React from 'react';
import { Project } from '@/types/project.types';
import { IssueSummary } from '@/types/issue.types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  FolderKanban,
  ChevronDown,
  Plus,
} from 'lucide-react';

interface IssueHeaderSummaryProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  summary: IssueSummary;
  onCreateClick: () => void;
}

export function IssueHeaderSummary({
  projects,
  selectedProjectId,
  onSelectProject,
  summary,
  onCreateClick,
}: IssueHeaderSummaryProps) {
  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-200">
              ERPNext ISSUE ENGINE
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Defect & Non-Conformance Tracker</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Open Issues & Defect Tracking
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Capture, triage, assign, and resolve engineering defects, design non-conformances, and program issues.
          </p>
        </div>

        {/* Action Controls: Project Filter & Create Button */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Project Selector */}
          <div className="relative min-w-[240px]">
            <div className="absolute left-3.5 top-3 text-sky-600">
              <FolderKanban className="h-4 w-4" />
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black focus:outline-none focus:ring-2 focus:ring-sky-500 transition cursor-pointer appearance-none shadow-2xs"
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

          {/* Create Issue Button */}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Issue</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
            <Layers className="h-3 w-3 text-slate-400" />
            Total Issues
          </div>
          <div className="text-xl font-black text-slate-900">{summary.totalIssues}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-sky-700 font-bold uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3 text-sky-500" />
            Open Issues
          </div>
          <div className="text-xl font-black text-sky-600">{summary.openIssues}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1">
            <Flame className="h-3 w-3 text-amber-500" />
            High Priority
          </div>
          <div className="text-xl font-black text-amber-600">{summary.highPriorityIssues}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-rose-700 font-bold uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            Urgent / Critical
          </div>
          <div className="text-xl font-black text-rose-600">{summary.urgentIssues}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Resolved
          </div>
          <div className="text-xl font-black text-emerald-600">{summary.resolvedIssues}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-purple-700 font-bold uppercase flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 text-purple-500" />
            On Hold
          </div>
          <div className="text-xl font-black text-purple-600">{summary.onHoldIssues}</div>
        </div>
      </div>
    </div>
  );
}
