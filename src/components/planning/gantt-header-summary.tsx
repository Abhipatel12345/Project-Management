import React from 'react';
import { Project } from '@/types/project.types';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectSearchSelector } from '@/components/projects/project-search-selector';
import {
  FolderKanban,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  User,
  ChevronDown,
  BookmarkPlus,
  Bookmark,
  TrendingUp,
} from 'lucide-react';

interface GanttHeaderSummaryProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  selectedProject: Project | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  overallProgress: number;

  // Baseline props
  onOpenManageBaselines?: () => void;
  activeBaselineName?: string;
}

export function GanttHeaderSummary({
  projects,
  selectedProjectId,
  onSelectProject,
  selectedProject,
  totalTasks,
  completedTasks,
  inProgressTasks,
  overdueTasks,
  upcomingTasks,
  overallProgress,
  onOpenManageBaselines,
  activeBaselineName,
}: GanttHeaderSummaryProps) {
  return (
    <div className="space-y-4 font-sans pt-1">
      {/* Top Banner & Project Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
              ENGINEERING TIMELINE ENGINE
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Interactive Gantt & Multiple Baselines</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Planning & Gantt Schedule
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Visualize project work packages, freeze schedule baselines (Baseline 1, 2, 3...), track planned vs actual dates, and analyze critical path items.
          </p>
        </div>

        {/* Action Controls: Project Selector Dropdown & Manage Baselines */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto min-w-[280px]">
          <ProjectSearchSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
            includeAllOption={false}
            className="flex-1 min-w-[240px]"
          />

          {onOpenManageBaselines && (
            <button
              onClick={onOpenManageBaselines}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs shrink-0"
            >
              <BookmarkPlus className="h-4 w-4 text-sky-100" />
              <span>Manage Baselines</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Project Summary Banner & Metrics */}
      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-bold text-sky-800 bg-white px-3 py-1 rounded-lg border border-sky-200 shadow-2xs">
              {selectedProject?.name || selectedProjectId}
            </span>
            <h2 className="text-base font-black text-slate-900">
              {selectedProject?.project_name || selectedProjectId}
            </h2>
            {selectedProject && <ProjectStatusBadge status={selectedProject.status} />}
            {activeBaselineName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                <Bookmark className="h-3 w-3 text-amber-600" /> Active Baseline: {activeBaselineName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Manager: <strong className="text-slate-900 font-bold">{selectedProject?.owner || 'Administrator'}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Target: {selectedProject?.expected_end_date || 'N/A'}
            </span>
          </div>
        </div>

        {/* Dynamic Metric Cards - Fully visible without clipping, responsive wrapping */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[76px] transition hover:border-slate-300">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Total Tasks</span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">{totalTasks}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[76px] transition hover:border-emerald-300">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Completed</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{completedTasks}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[76px] transition hover:border-blue-300">
            <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>In Progress</span>
            </div>
            <div className="text-2xl font-black text-blue-600 tracking-tight mt-1">{inProgressTasks}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[76px] transition hover:border-rose-300">
            <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>Overdue</span>
            </div>
            <div className="text-2xl font-black text-rose-600 tracking-tight mt-1">{overdueTasks}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[76px] transition hover:border-amber-300">
            <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Upcoming</span>
            </div>
            <div className="text-2xl font-black text-amber-600 tracking-tight mt-1">{upcomingTasks}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[76px] transition hover:border-teal-300">
            <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              <span>Overall Progress</span>
            </div>
            <div className="text-2xl font-black text-teal-600 tracking-tight mt-1">{overallProgress}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
