import React, { useState, useMemo } from 'react';
import { Task } from '@/types/task.types';
import { ProjectTeamMember } from '@/types/team.types';
import { ProjectBaseline } from '@/types/baseline.types';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Flame,
  BookmarkPlus,
  SlidersHorizontal,
  Bookmark,
  Layers,
  SkipForward,
} from 'lucide-react';
import { motion } from 'framer-motion';

export type GanttViewMode = 'day' | 'week' | 'month';

interface GanttChartViewProps {
  tasks: Task[];
  teamMembers: ProjectTeamMember[];
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDateChange: (task: Task, newStart: string, newEnd: string) => Promise<void>;
  viewMode: GanttViewMode;
  setViewMode: (mode: GanttViewMode) => void;
  showCriticalPathOnly: boolean;
  setShowCriticalPathOnly: (val: boolean) => void;

  // Baseline Props
  baselines?: ProjectBaseline[];
  selectedBaselineId?: string;
  onSelectBaselineId?: (id: string) => void;
  onOpenManageBaselines?: () => void;
  isCompareMode?: boolean;
  onToggleCompareMode?: (val?: boolean) => void;

  // Skip & Retime Triggers
  onSkipTask?: (task: Task) => void;
}

export function GanttChartView({
  tasks,
  teamMembers,
  onEditTask,
  onViewTask,
  onDateChange,
  viewMode,
  setViewMode,
  showCriticalPathOnly,
  setShowCriticalPathOnly,
  baselines = [],
  selectedBaselineId = 'CURRENT',
  onSelectBaselineId,
  onOpenManageBaselines,
  isCompareMode = false,
  onToggleCompareMode,
  onSkipTask,
}: GanttChartViewProps) {
  const [currentBaseDate, setCurrentBaseDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Parse date helpers
  const parseDate = (dStr?: string): Date => {
    if (!dStr || dStr === 'N/A') return new Date();
    const clean = dStr.split(' ')[0].split('T')[0];
    const d = new Date(clean);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Active or selected baseline for visual overlay
  const activeBaseline = useMemo(() => {
    if (!selectedBaselineId || selectedBaselineId === 'CURRENT') return null;
    if (selectedBaselineId === 'ACTIVE') {
      return baselines.find((b) => b.status === 'Active') || (baselines.length > 0 ? baselines[0] : null);
    }
    return baselines.find((b) => b.baseline_id === selectedBaselineId) || null;
  }, [baselines, selectedBaselineId]);

  // Generate Timeline Header Columns based on ViewMode
  const timelineColumns = useMemo(() => {
    const cols: { label: string; subLabel: string; date: Date }[] = [];
    const start = new Date(currentBaseDate);

    if (viewMode === 'day') {
      start.setDate(start.getDate() - 3);
      for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        cols.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          subLabel: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
          date: d,
        });
      }
    } else if (viewMode === 'week') {
      start.setDate(start.getDate() - 14);
      for (let i = 0; i < 8; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i * 7);
        cols.push({
          label: `W${i + 1}`,
          subLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: d,
        });
      }
    } else {
      // month
      start.setMonth(start.getMonth() - 1);
      for (let i = 0; i < 6; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        cols.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          subLabel: d.getFullYear().toString(),
          date: d,
        });
      }
    }

    return cols;
  }, [currentBaseDate, viewMode]);

  // Identify Critical Path tasks
  const criticalPathTaskIds = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.priority === 'Urgent' || t.priority === 'High' || t.is_overdue || (t.progress || 0) < 50) {
        set.add(t.name);
      }
    });
    return set;
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (showCriticalPathOnly) {
      result = result.filter((t) => criticalPathTaskIds.has(t.name));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) => t.subject.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    return result;
  }, [tasks, showCriticalPathOnly, criticalPathTaskIds, searchQuery, statusFilter, priorityFilter]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentBaseDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 7);
    else if (viewMode === 'week') d.setDate(d.getDate() - 28);
    else d.setMonth(d.getMonth() - 3);
    setCurrentBaseDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentBaseDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 7);
    else if (viewMode === 'week') d.setDate(d.getDate() + 28);
    else d.setMonth(d.getMonth() + 3);
    setCurrentBaseDate(d);
  };

  const handleToday = () => {
    setCurrentBaseDate(new Date());
  };

  // Compute Task Bar position %
  const getTaskBarSpan = (startStr?: string, endStr?: string) => {
    if (timelineColumns.length === 0) return { left: '0%', width: '100%' };

    const firstColDate = timelineColumns[0].date.getTime();
    const lastColDate = timelineColumns[timelineColumns.length - 1].date.getTime();
    const totalTimeSpan = Math.max(lastColDate - firstColDate, 86400000);

    const startDate = parseDate(startStr).getTime();
    const endDate = parseDate(endStr).getTime();

    const clampedStart = Math.max(startDate, firstColDate);
    const clampedEnd = Math.min(Math.max(endDate, clampedStart + 86400000), lastColDate + 86400000);

    const leftPct = Math.max(0, Math.min(100, ((clampedStart - firstColDate) / totalTimeSpan) * 100));
    const widthPct = Math.max(8, Math.min(100 - leftPct, ((clampedEnd - clampedStart) / totalTimeSpan) * 100));

    return {
      left: `${leftPct}%`,
      width: `${widthPct}%`,
    };
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View Mode Controls & Critical Path */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'day' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day View
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'week' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week View
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'month' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month View
              </button>
            </div>

            {/* Critical Path Toggle */}
            <button
              onClick={() => setShowCriticalPathOnly(!showCriticalPathOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showCriticalPathOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              <span>{showCriticalPathOnly ? 'Critical Path Only' : 'Critical Path'}</span>
            </button>
          </div>

          {/* Baseline Selector & Manage Baselines Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Baseline Selector Dropdown */}
            <div className="relative">
              <select
                value={isCompareMode ? 'COMPARE' : selectedBaselineId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'COMPARE') {
                    if (onToggleCompareMode) onToggleCompareMode(true);
                  } else {
                    if (onToggleCompareMode) onToggleCompareMode(false);
                    if (onSelectBaselineId) onSelectBaselineId(val);
                  }
                }}
                className="pl-3 pr-8 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-500 transition cursor-pointer shadow-2xs"
              >
                <option value="CURRENT">Current Schedule (Live)</option>
                {baselines.map((b) => (
                  <option key={b.baseline_id} value={b.baseline_id}>
                    {b.baseline_name} ({b.status === 'Active' ? 'Active' : 'Baseline'})
                  </option>
                ))}
                <option value="COMPARE">📊 Compare Baselines Mode</option>
              </select>
            </div>

            {/* Manage Baselines Modal Trigger */}
            <button
              onClick={onOpenManageBaselines}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-sky-100" />
              <span>Manage Baselines</span>
            </button>

            {/* Compare Toggle Button */}
            <button
              onClick={() => onToggleCompareMode && onToggleCompareMode(!isCompareMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isCompareMode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{isCompareMode ? 'Exit Compare' : 'Compare'}</span>
            </button>

            {/* Timeline Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend Banner when Baseline is Active */}
        {(activeBaseline || isCompareMode) && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-wrap items-center justify-between text-xs text-amber-900 gap-2 font-medium">
            <div className="flex items-center gap-3">
              <span className="font-bold flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                Active Baseline Reference: <strong className="font-black text-amber-950">{activeBaseline?.baseline_name || 'Baseline 1'}</strong>
              </span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-4 rounded-sm bg-sky-500 border border-sky-600 inline-block" /> Current Schedule
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-4 rounded-sm bg-amber-400 border border-amber-500 border-dashed inline-block" /> Baseline Snapshot
                </span>
              </div>
            </div>
            <span className="text-[11px] text-amber-700 font-mono">
              Captured: {activeBaseline?.snapshot_date || 'Active'}
            </span>
          </div>
        )}

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline tasks..."
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Working">Working / In Progress</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent / Critical</option>
          </select>
        </div>
      </div>

      {/* Main Gantt Split Container */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Table Panel (5 cols) */}
          <div className="lg:col-span-5 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Work Package & ID</th>
                  <th className="py-3 px-3">Assignee</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Progress</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      No tasks found matching your filter scope.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const isCritical = criticalPathTaskIds.has(t.name);
                    return (
                      <tr key={t.name} className="hover:bg-slate-50/70 transition h-16">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            {isCritical && (
                              <span title="Critical Path Task">
                                <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              </span>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 truncate max-w-[140px]" title={t.subject}>
                                {t.subject}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{t.name}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-3">
                          <div className="text-slate-800 text-[11px] font-semibold truncate max-w-[90px]">
                            {t.assigned_employee_name || t.assigned_to || 'Unassigned'}
                          </div>
                        </td>

                        <td className="py-2 px-3 text-center">
                          <TaskStatusBadge status={t.status} />
                        </td>

                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {t.progress || 0}%
                        </td>

                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onSkipTask && t.status !== 'Skipped' && t.status !== 'Completed' && (
                              <button
                                onClick={() => onSkipTask(t)}
                                className="p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                                title="Skip Task Work Package"
                              >
                                <SkipForward className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onViewTask(t)}
                              className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                              title="View Task Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onEditTask(t)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Edit Task"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
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

          {/* Right Timeline Canvas (7 cols) */}
          <div className="lg:col-span-7 overflow-x-auto relative bg-slate-50/40">
            {/* Date Header Columns */}
            <div className="grid grid-flow-col auto-cols-fr border-b border-slate-200 bg-slate-50 text-center h-10 divide-x divide-slate-200/80">
              {timelineColumns.map((col, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center px-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">{col.label}</span>
                  <span className="text-[10px] font-black text-slate-800">{col.subLabel}</span>
                </div>
              ))}
            </div>

            {/* Timeline Rows */}
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((t) => {
                const barSpan = getTaskBarSpan(t.exp_start_date, t.exp_end_date);
                const isCritical = criticalPathTaskIds.has(t.name);
                const isSkipped = t.status === 'Skipped';

                // Baseline Reference Bar positioning
                const btSnapshot = activeBaseline?.tasks.find((bt) => bt.task_id === t.name);
                const baselineBarSpan = btSnapshot
                  ? getTaskBarSpan(btSnapshot.planned_start_date, btSnapshot.planned_end_date)
                  : null;

                return (
                  <div key={t.name} className="relative h-16 flex flex-col justify-center px-2 py-1 space-y-1">
                    {/* Background Date Grid Lines */}
                    <div className="absolute inset-0 grid grid-flow-col auto-cols-fr divide-x divide-slate-200/40 pointer-events-none">
                      {timelineColumns.map((_, idx) => (
                        <div key={idx} className="h-full" />
                      ))}
                    </div>

                    {/* Primary Current Task Bar */}
                    <motion.div
                      initial={{ scaleX: 0.8, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      className={`relative h-6 rounded-xl border flex items-center justify-between px-2 text-[10px] font-extrabold shadow-2xs transition-all z-10 ${
                        isSkipped
                          ? 'bg-purple-50 border-purple-300 text-purple-900 line-through opacity-70'
                          : isCritical
                          ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-500/20'
                          : t.status === 'Completed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-sky-50 border-sky-300 text-sky-900'
                      }`}
                      style={{
                        left: barSpan.left,
                        width: barSpan.width,
                      }}
                      onClick={() => onEditTask(t)}
                    >
                      {/* Inner Progress Fill */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 rounded-xl transition-all duration-300 opacity-30 ${
                          isCritical ? 'bg-rose-500' : t.status === 'Completed' ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.min(t.progress || 0, 100)}%` }}
                      />

                      {/* Label & Progress */}
                      <span className="truncate max-w-[110px] z-10 font-bold" title={t.subject}>
                        {t.subject}
                      </span>
                      <span className="font-mono z-10 shrink-0 font-black">{t.progress || 0}%</span>
                    </motion.div>

                    {/* Baseline Snapshot Ghost Reference Bar */}
                    {baselineBarSpan && (
                      <div
                        className="relative h-3 rounded-md bg-amber-200/90 border border-amber-500 border-dashed z-0 opacity-80 transition-all"
                        style={{
                          left: baselineBarSpan.left,
                          width: baselineBarSpan.width,
                        }}
                        title={`Baseline Snapshot: ${btSnapshot?.planned_start_date} to ${btSnapshot?.planned_end_date} (${btSnapshot?.duration}d)`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
