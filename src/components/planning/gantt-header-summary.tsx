import React from 'react';
import { Project } from '@/types/project.types';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
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
    <div className="space-y-4 font-sans">
      {/* Top Banner & Project Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
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
          <div className="relative flex-1 min-w-[220px]">
            <div className="absolute left-3.5 top-3 text-sky-600">
              <FolderKanban className="h-4 w-4" />
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer appearance-none shadow-2xs"
            >
              {projects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.project_name || p.name} ({p.name})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {onOpenManageBaselines && (
            <button
              onClick={onOpenManageBaselines}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-2xs shrink-0"
            >
              <BookmarkPlus className="h-4 w-4 text-amber-400" />
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

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" />
              Total Tasks
            </div>
            <div className="text-xl font-black text-slate-900">{totalTasks}</div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Completed
            </div>
            <div className="text-xl font-black text-emerald-600">{completedTasks}</div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] text-blue-700 font-bold uppercase flex items-center justify-center gap-1">
              <Activity className="h-3 w-3 text-blue-500" />
              In Progress
            </div>
            <div className="text-xl font-black text-blue-600">{inProgressTasks}</div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] text-rose-700 font-bold uppercase flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              Overdue
            </div>
            <div className="text-xl font-black text-rose-600">{overdueTasks}</div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              Upcoming
            </div>
            <div className="text-xl font-black text-amber-600">{upcomingTasks}</div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] text-teal-700 font-bold uppercase">Overall Progress</div>
            <div className="text-xl font-black text-teal-600">{overallProgress}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
