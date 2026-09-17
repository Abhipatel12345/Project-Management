'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { ProjectTeamMember } from '@/types/team.types';
import { ProjectBaseline } from '@/types/baseline.types';
import { Gate } from '@/types/gate.types';
import { TaskRelationship, DependencyType } from '@/types/task-dependency.types';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { useProjectDependencies } from '@/hooks/use-task-dependencies';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit2,
  Flame,
  BookmarkPlus,
  SlidersHorizontal,
  Bookmark,
  Layers,
  SkipForward,
  Clock,
  GitFork,
  Lock,
  Plus,
  Sparkles,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPhaseName, getPhaseBadgeColors } from '@/constants/phases';
import { BOARD_FUNCTIONS, PDT_ROLES } from '@/config/charter-choices.config';
import {
  formatDate,
  parseDate,
  addDays,
  getDurationDays,
  recalculateSchedule,
  computeTaskRYG,
} from '@/utils/gantt-scheduling-engine';
import { exportGanttToExcel, exportGanttToMspXml } from '@/utils/msp-exporter';
import { MspImportTask } from '@/utils/msp-importer';
import { CreateCustomTaskDialog } from './dialogs/create-custom-task-dialog';
import { CreateCustomMilestoneDialog } from './dialogs/create-custom-milestone-dialog';
import { RetimeTaskDialog } from './dialogs/retime-task-dialog';
import { ImportMspDialog } from './dialogs/import-msp-dialog';

export type GanttViewMode = 'day' | 'week' | 'month' | 'quarter';

interface GanttChartViewProps {
  tasks: Task[];
  teamMembers: ProjectTeamMember[];
  gates?: Gate[];
  projectName?: string;
  projectId?: string;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDateChange: (task: Task, newStart: string, newEnd: string) => Promise<void>;
  onCreateCustomTask?: (taskData: Partial<Task>, files?: File[]) => Promise<void>;
  onCreateCustomMilestone?: (milestoneData: Partial<Task>) => Promise<void>;
  onDeleteTask?: (task: Task) => Promise<void>;
  onRetimeTask?: (task: Task, retimedToGate: string, newStart: string, newEnd: string, reason: string) => Promise<void>;
  onImportTasks?: (tasks: MspImportTask[]) => Promise<void>;
  onProgressChange?: (task: Task, newProgress: number) => Promise<void>;

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
  gates = [],
  projectName = '',
  projectId = '',
  onEditTask,
  onViewTask,
  onDateChange,
  onCreateCustomTask,
  onCreateCustomMilestone,
  onDeleteTask,
  onRetimeTask,
  onImportTasks,
  onProgressChange,
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
  const activeProjectId = projectId || tasks[0]?.project || '';
  const activeProjectName = projectName || tasks[0]?.project_name || activeProjectId;

  const [currentBaseDate, setCurrentBaseDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [functionFilter, setFunctionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [phaseFilter, setPhaseFilter] = useState('ALL');

  // WBS Expand/Collapse state
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

  // Dialogs state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [retimingTask, setRetimingTask] = useState<Task | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Dragging state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragDaysDelta, setDragDaysDelta] = useState<number>(0);

  // Fetch project dependencies
  const { data: projectDependencies = [] } = useProjectDependencies(activeProjectId);

  // Scheduling calculation with CPM
  const scheduleCalc = useMemo(() => {
    return recalculateSchedule(tasks, projectDependencies);
  }, [tasks, projectDependencies]);

  // Active baseline for comparison
  const activeBaseline = useMemo(() => {
    if (!selectedBaselineId || selectedBaselineId === 'CURRENT') return null;
    if (selectedBaselineId === 'ACTIVE') {
      return baselines.find((b) => b.status === 'Active') || (baselines.length > 0 ? baselines[0] : null);
    }
    return baselines.find((b) => b.baseline_id === selectedBaselineId) || null;
  }, [baselines, selectedBaselineId]);

  // Generate Timeline Header Columns based on ViewMode
  const timelineColumns = useMemo(() => {
    const cols: { label: string; subLabel: string; date: Date; isToday: boolean }[] = [];
    const start = new Date(currentBaseDate);
    const todayStr = formatDate(new Date());

    if (viewMode === 'day') {
      start.setDate(start.getDate() - 3);
      for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        cols.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          subLabel: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
          date: d,
          isToday: formatDate(d) === todayStr,
        });
      }
    } else if (viewMode === 'week') {
      start.setDate(start.getDate() - 14);
      for (let i = 0; i < 10; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i * 7);
        cols.push({
          label: `W${i + 1}`,
          subLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: d,
          isToday: formatDate(d) === todayStr,
        });
      }
    } else if (viewMode === 'month') {
      start.setMonth(start.getMonth() - 1);
      for (let i = 0; i < 8; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        cols.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          subLabel: d.getFullYear().toString(),
          date: d,
          isToday: d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(),
        });
      }
    } else {
      // Quarter
      start.setMonth(Math.floor(start.getMonth() / 3) * 3 - 3);
      for (let i = 0; i < 6; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i * 3);
        const qNum = Math.floor(d.getMonth() / 3) + 1;
        cols.push({
          label: `Q${qNum}`,
          subLabel: d.getFullYear().toString(),
          date: d,
          isToday: false,
        });
      }
    }

    return cols;
  }, [currentBaseDate, viewMode]);

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
    const widthPct = Math.max(4, Math.min(100 - leftPct, ((clampedEnd - clampedStart) / totalTimeSpan) * 100));

    return {
      left: `${leftPct}%`,
      width: `${widthPct}%`,
    };
  };

  // Compute Today Line left position %
  const todayLineLeftPct = useMemo(() => {
    if (timelineColumns.length === 0) return null;
    const firstColDate = timelineColumns[0].date.getTime();
    const lastColDate = timelineColumns[timelineColumns.length - 1].date.getTime();
    const totalSpan = lastColDate - firstColDate;
    if (totalSpan <= 0) return null;

    const todayMs = new Date().getTime();
    if (todayMs < firstColDate || todayMs > lastColDate + 86400000) return null;

    const pct = ((todayMs - firstColDate) / totalSpan) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [timelineColumns]);

  // Compute PDP Gate milestone markers positions
  const gateMarkers = useMemo(() => {
    if (timelineColumns.length === 0 || gates.length === 0) return [];
    const firstColDate = timelineColumns[0].date.getTime();
    const lastColDate = timelineColumns[timelineColumns.length - 1].date.getTime();
    const totalSpan = lastColDate - firstColDate;
    if (totalSpan <= 0) return [];

    return gates
      .map((g) => {
        const dStr = g.target_date || g.actual_date;
        if (!dStr) return null;
        const gTime = parseDate(dStr).getTime();
        if (gTime < firstColDate || gTime > lastColDate + 86400000) return null;
        const leftPct = ((gTime - firstColDate) / totalSpan) * 100;
        return {
          gateName: g.gate_name || g.name,
          date: dStr,
          leftPct: Math.max(0, Math.min(100, leftPct)),
        };
      })
      .filter(Boolean) as { gateName: string; date: string; leftPct: number }[];
  }, [timelineColumns, gates]);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Critical Path only
    if (showCriticalPathOnly) {
      result = result.filter((t) => scheduleCalc.criticalPathTaskIds.has(t.name));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.wbs && t.wbs.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Function filter
    if (functionFilter !== 'ALL') {
      result = result.filter((t) => t.function_name === functionFilter || t.custom_function === functionFilter);
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      result = result.filter((t) => t.role === roleFilter || t.custom_role === roleFilter);
    }

    // Owner filter
    if (ownerFilter !== 'ALL') {
      result = result.filter(
        (t) =>
          t.assigned_to === ownerFilter ||
          t.assigned_employee_name?.toLowerCase().includes(ownerFilter.toLowerCase())
      );
    }

    // Phase filter
    if (phaseFilter !== 'ALL') {
      result = result.filter((t) => t.phase === phaseFilter || t.gate === phaseFilter);
    }

    return result;
  }, [
    tasks,
    showCriticalPathOnly,
    scheduleCalc.criticalPathTaskIds,
    searchQuery,
    statusFilter,
    priorityFilter,
    functionFilter,
    roleFilter,
    ownerFilter,
    phaseFilter,
  ]);

  // Group filtered tasks by Phase for WBS hierarchy
  const groupedTasksByPhase = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach((t) => {
      const p = t.phase || 'General Deliverables';
      const list = map.get(p) || [];
      list.push(t);
      map.set(p, list);
    });
    return Array.from(map.entries());
  }, [filteredTasks]);

  // WBS Expand/Collapse handlers
  const togglePhaseCollapse = (phase: string) => {
    const next = new Set(collapsedPhases);
    if (next.has(phase)) next.delete(phase);
    else next.add(phase);
    setCollapsedPhases(next);
  };

  const expandAllPhases = () => setCollapsedPhases(new Set());
  const collapseAllPhases = () => {
    const all = new Set(groupedTasksByPhase.map(([p]) => p));
    setCollapsedPhases(all);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setFunctionFilter('ALL');
    setRoleFilter('ALL');
    setOwnerFilter('ALL');
    setPhaseFilter('ALL');
    setShowCriticalPathOnly(false);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    functionFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    ownerFilter !== 'ALL' ||
    phaseFilter !== 'ALL' ||
    showCriticalPathOnly;

  // Timeline Navigation Handlers
  const handlePrev = () => {
    const d = new Date(currentBaseDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 7);
    else if (viewMode === 'week') d.setDate(d.getDate() - 28);
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 3);
    else d.setMonth(d.getMonth() - 6);
    setCurrentBaseDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentBaseDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 7);
    else if (viewMode === 'week') d.setDate(d.getDate() + 28);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 3);
    else d.setMonth(d.getMonth() + 6);
    setCurrentBaseDate(d);
  };

  const handleToday = () => {
    setCurrentBaseDate(new Date());
  };

  // Drag & Drop Date Change Handler
  const handleDragStart = (e: React.MouseEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    setDragStartX(e.clientX);
    setDragDaysDelta(0);
  };

  const handleDragEnd = async (task: Task) => {
    if (draggingTaskId === task.name && dragDaysDelta !== 0) {
      const origStart = parseDate(task.exp_start_date);
      const origEnd = parseDate(task.exp_end_date);
      const newStart = formatDate(addDays(origStart, dragDaysDelta));
      const newEnd = formatDate(addDays(origEnd, dragDaysDelta));

      await onDateChange(task, newStart, newEnd);
    }
    setDraggingTaskId(null);
    setDragStartX(0);
    setDragDaysDelta(0);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Action Bar & Summary Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: View Mode Controls & Critical Path Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'day' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'week' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'month' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('quarter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'quarter' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quarter
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
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white border border-rose-200 text-[10px] font-black text-rose-600">
                {scheduleCalc.criticalPathTaskIds.size}
              </span>
            </button>

            {/* Expand / Collapse All */}
            <button
              onClick={collapsedPhases.size > 0 ? expandAllPhases : collapseAllPhases}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>{collapsedPhases.size > 0 ? 'Expand All' : 'Collapse All'}</span>
            </button>
          </div>

          {/* Right: Baselines & Task Actions & Import/Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Baseline Selector */}
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

            {/* Manage Baselines */}
            <button
              onClick={onOpenManageBaselines}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 font-bold text-xs transition cursor-pointer"
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-amber-700" />
              <span>Baselines</span>
            </button>

            {/* Add Custom Task Trigger */}
            {onCreateCustomTask && (
              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Task</span>
              </button>
            )}

            {/* Add Custom Milestone Trigger */}
            {onCreateCustomMilestone && (
              <button
                onClick={() => setIsCreateMilestoneOpen(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Milestone</span>
              </button>
            )}

            {/* Import Schedule (MSP / Excel) */}
            {onImportTasks && (
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                title="Import MS Project XML or Excel"
              >
                <Upload className="h-3.5 w-3.5 text-slate-600" />
                <span>Import</span>
              </button>
            )}

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Export</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in duration-100">
                  <button
                    onClick={() => {
                      exportGanttToExcel(activeProjectName, activeProjectId, tasks, projectDependencies);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Export to Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportGanttToMspXml(activeProjectName, activeProjectId, tasks, projectDependencies);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="h-4 w-4 text-sky-600" />
                    <span>Export to MSP XML (.xml)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Timeline Date Navigation */}
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
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between text-xs text-amber-900 gap-2 font-medium">
            <div className="flex items-center gap-3">
              <span className="font-bold flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                Active Baseline Reference:{' '}
                <strong className="font-black text-amber-950">
                  {activeBaseline?.baseline_name || 'Baseline 1'}
                </strong>
              </span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-4 rounded-sm bg-sky-500 border border-sky-600 inline-block" /> Live Schedule
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-4 rounded-sm bg-amber-400 border border-amber-500 border-dashed inline-block" />{' '}
                  Baseline Snapshot
                </span>
              </div>
            </div>
            <span className="text-[11px] text-amber-700 font-mono">
              Captured: {activeBaseline?.snapshot_date || 'Active'}
            </span>
          </div>
        )}

        {/* Multi-Filter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 border-t border-slate-100 pt-3 text-xs">
          {/* Search */}
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or WBS..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Function Filter */}
          <select
            value={functionFilter}
            onChange={(e) => setFunctionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
          >
            <option value="ALL">Function: All</option>
            {BOARD_FUNCTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer truncate"
          >
            <option value="ALL">Role: All</option>
            {PDT_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Owner Filter */}
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
          >
            <option value="ALL">Owner: All</option>
            {teamMembers.map((m) => (
              <option key={m.id || m.user_email} value={m.user_email}>
                {m.employee_name || m.user_email}
              </option>
            ))}
          </select>

          {/* Phase / Gate Filter */}
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer truncate"
          >
            <option value="ALL">Phase/Gate: All</option>
            <option value="Phase 1: Concept & Planning">Phase 1</option>
            <option value="Phase 2: Product Design & Development">Phase 2</option>
            <option value="Phase 3: Process Design & Development">Phase 3</option>
            <option value="Phase 4: Validation & Launch">Phase 4</option>
            <option value="Phase 5: Production & Feedback">Phase 5</option>
            <option value="1. PL">Gate 1. PL</option>
            <option value="2. VC">Gate 2. VC</option>
            <option value="3. TKO">Gate 3. TKO</option>
            <option value="4. VL">Gate 4. VL</option>
            <option value="5. CPA">Gate 5. CPA</option>
            <option value="6. CT">Gate 6. CT</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
          >
            <option value="ALL">Status: All</option>
            <option value="Open">Open</option>
            <option value="Working">Working</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Completed">Completed</option>
            <option value="Skipped">Skipped</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Gantt Split Container (WBS Table on Left + Timeline Canvas on Right) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Table Panel (6 cols for complete Inteva fields) */}
          <div className="lg:col-span-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-16">WBS</th>
                  <th className="py-3 px-3">Task Name & ID</th>
                  <th className="py-3 px-2">Owner / Team</th>
                  <th className="py-3 px-2 text-center">Fn / Role</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-2 text-center">Prog</th>
                  <th className="py-3 px-2 text-center">RYG</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {groupedTasksByPhase.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No tasks found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  groupedTasksByPhase.map(([phaseName, phaseTasks]) => {
                    const isCollapsed = collapsedPhases.has(phaseName);
                    const phaseColors = getPhaseBadgeColors(phaseName);

                    return (
                      <React.Fragment key={phaseName}>
                        {/* WBS Phase Header Row */}
                        <tr
                          onClick={() => togglePhaseCollapse(phaseName)}
                          className="bg-slate-100/70 hover:bg-slate-100 cursor-pointer transition select-none"
                        >
                          <td colSpan={8} className="py-2 px-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={`h-4 w-4 text-slate-500 transition-transform ${
                                    isCollapsed ? '-rotate-90' : ''
                                  }`}
                                />
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${phaseColors.badge}`}>
                                  {phaseName}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">
                                  ({phaseTasks.length} tasks)
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Individual Task Rows */}
                        {!isCollapsed &&
                          phaseTasks.map((t, idx) => {
                            const isCritical = scheduleCalc.criticalPathTaskIds.has(t.name);
                            const ryg = scheduleCalc.rygStatus.get(t.name) || 'Green';
                            const isMilestone = t.is_milestone;
                            const isSkipped = t.status === 'Skipped';
                            const isMandatory = t.is_mandatory_pdp;

                            return (
                              <tr
                                key={t.name}
                                className={`hover:bg-slate-50/80 transition h-14 ${
                                  isSkipped ? 'bg-purple-50/30' : isCritical ? 'bg-rose-50/20' : ''
                                }`}
                              >
                                {/* WBS */}
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                  {t.wbs || `${idx + 1}`}
                                </td>

                                {/* Task Name & ID */}
                                <td className="py-2 px-3 max-w-[190px]">
                                  <div className="flex items-center gap-1.5">
                                    {isCritical && (
                                      <span title="Critical Path Task">
                                        <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                      </span>
                                    )}
                                    {isMilestone && (
                                      <span title="Project Milestone" className="text-amber-500 font-bold text-sm shrink-0">
                                        ◆
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <div
                                        className={`font-bold truncate text-[11px] ${
                                          isSkipped ? 'line-through text-purple-900' : 'text-slate-900'
                                        }`}
                                        title={t.subject}
                                      >
                                        {t.subject}
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                        <span>{t.name}</span>
                                        {t.is_custom && (
                                          <span className="px-1 py-0.2 rounded bg-sky-50 text-sky-700 text-[8px] font-bold border border-sky-200">
                                            Custom
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Owner / Assignee */}
                                <td className="py-2 px-2 max-w-[100px] truncate text-[11px] font-semibold text-slate-800">
                                  {t.assigned_employee_name || t.assigned_to || 'Unassigned'}
                                </td>

                                {/* Function & Role */}
                                <td className="py-2 px-2 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-bold">
                                      {t.function_name || t.custom_function || '-'}
                                    </span>
                                    {t.gate && (
                                      <span className="text-[9px] font-mono text-slate-400">{t.gate}</span>
                                    )}
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-2 px-2 text-center">
                                  <TaskStatusBadge status={t.status} />
                                </td>

                                {/* Progress */}
                                <td className="py-2 px-2 text-center">
                                  <span className="font-mono font-black text-slate-900">{t.progress || 0}%</span>
                                </td>

                                {/* RYG Indicator */}
                                <td className="py-2 px-2 text-center">
                                  <span
                                    className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ${
                                      ryg === 'Red'
                                        ? 'bg-rose-500 ring-rose-200'
                                        : ryg === 'Yellow'
                                        ? 'bg-amber-400 ring-amber-200'
                                        : 'bg-emerald-500 ring-emerald-200'
                                    }`}
                                    title={`Schedule Health: ${ryg}`}
                                  />
                                </td>

                                {/* Actions */}
                                <td className="py-2 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Skip Task */}
                                    {onSkipTask && !isSkipped && t.status !== 'Completed' && (
                                      <button
                                        onClick={() => onSkipTask(t)}
                                        className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                                        title="Skip Task"
                                      >
                                        <SkipForward className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* Retime Task */}
                                    {onRetimeTask && (
                                      <button
                                        onClick={() => setRetimingTask(t)}
                                        className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                                        title="Retime to Future Gate"
                                      >
                                        <Clock className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* View */}
                                    <button
                                      onClick={() => onViewTask(t)}
                                      className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                                      title="View Details"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Edit */}
                                    <button
                                      onClick={() => onEditTask(t)}
                                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                      title="Edit Task"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Delete: Only Custom Tasks/Milestones; Mandatory PDP Protected */}
                                    {onDeleteTask && (
                                      t.is_custom ? (
                                        <button
                                          onClick={() => onDeleteTask(t)}
                                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                          title="Delete Custom Task"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      ) : (
                                        <span
                                          className="p-1 text-slate-300 cursor-not-allowed"
                                          title="Mandatory PDP Task is protected and cannot be deleted"
                                        >
                                          <Lock className="h-3.5 w-3.5" />
                                        </span>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Timeline Canvas (6 cols) */}
          <div className="lg:col-span-6 overflow-x-auto relative bg-slate-50/40 select-none">
            {/* Date Header Columns */}
            <div className="grid grid-flow-col auto-cols-fr border-b border-slate-200 bg-slate-50 text-center h-10 divide-x divide-slate-200/80 sticky top-0 z-20">
              {timelineColumns.map((col, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center px-1 ${
                    col.isToday ? 'bg-rose-50/60' : ''
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase ${col.isToday ? 'text-rose-600' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                  <span className={`text-[10px] font-black ${col.isToday ? 'text-rose-900 font-extrabold' : 'text-slate-800'}`}>
                    {col.subLabel}
                  </span>
                </div>
              ))}
            </div>

            {/* Today Line Indicator (Vertical Red Dashed Line) */}
            {todayLineLeftPct !== null && (
              <div
                className="absolute top-10 bottom-0 z-20 pointer-events-none border-l-2 border-rose-500 border-dashed"
                style={{ left: `${todayLineLeftPct}%` }}
                title="Today"
              >
                <span className="absolute -top-3 -left-3 px-1 rounded bg-rose-500 text-white text-[8px] font-bold">
                  Today
                </span>
              </div>
            )}

            {/* PDP Gate Markers */}
            {gateMarkers.map((gm, idx) => (
              <div
                key={idx}
                className="absolute top-10 bottom-0 z-10 pointer-events-none border-l border-emerald-500"
                style={{ left: `${gm.leftPct}%` }}
              >
                <span className="absolute top-1 -left-2 px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[8px] font-black shadow-xs whitespace-nowrap">
                  {gm.gateName}
                </span>
              </div>
            ))}

            {/* Timeline Rows matching Table Rows */}
            <div className="divide-y divide-slate-100">
              {groupedTasksByPhase.map(([phaseName, phaseTasks]) => {
                const isCollapsed = collapsedPhases.has(phaseName);

                return (
                  <React.Fragment key={phaseName}>
                    {/* Phase Spacer Row */}
                    <div className="h-[37px] bg-slate-100/30 border-b border-slate-200/50" />

                    {!isCollapsed &&
                      phaseTasks.map((t) => {
                        const barSpan = getTaskBarSpan(t.exp_start_date, t.exp_end_date);
                        const isCritical = scheduleCalc.criticalPathTaskIds.has(t.name);
                        const isSkipped = t.status === 'Skipped';
                        const isMilestone = t.is_milestone;
                        const ryg = scheduleCalc.rygStatus.get(t.name) || 'Green';

                        const taskPreds = projectDependencies.filter((d: TaskRelationship) => d.successor_id === t.name);
                        const isBlocked = taskPreds.some((d: TaskRelationship) => {
                          const p = tasks.find((pt: Task) => pt.name === d.predecessor_id);
                          return (
                            d.dependency_type === 'FS' &&
                            p &&
                            p.status !== 'Completed' &&
                            p.status !== 'Skipped'
                          );
                        });
                        const hasDeps =
                          taskPreds.length > 0 ||
                          projectDependencies.some((d: TaskRelationship) => d.predecessor_id === t.name);

                        // Baseline Reference Bar positioning
                        const btSnapshot = activeBaseline?.tasks.find((bt) => bt.task_id === t.name);
                        const baselineBarSpan = btSnapshot
                          ? getTaskBarSpan(btSnapshot.planned_start_date, btSnapshot.planned_end_date)
                          : null;

                        return (
                          <div
                            key={t.name}
                            className="relative h-14 flex flex-col justify-center px-2 py-1 space-y-1"
                          >
                            {/* Background Date Grid Lines */}
                            <div className="absolute inset-0 grid grid-flow-col auto-cols-fr divide-x divide-slate-200/40 pointer-events-none">
                              {timelineColumns.map((_, i) => (
                                <div key={i} className="h-full" />
                              ))}
                            </div>

                            {/* Milestone Marker (Diamond ◆) vs Task Bar */}
                            {isMilestone ? (
                              <div
                                className="relative flex items-center z-10 cursor-pointer"
                                style={{ left: barSpan.left }}
                                onClick={() => onEditTask(t)}
                                title={`Milestone: ${t.subject} (${t.exp_start_date})`}
                              >
                                <div className="h-5 w-5 rotate-45 bg-amber-500 border-2 border-amber-600 shadow-md flex items-center justify-center">
                                  <div className="h-1.5 w-1.5 bg-white rounded-full" />
                                </div>
                                <span className="ml-2 text-[10px] font-black text-amber-900 truncate max-w-[120px] bg-white/80 px-1 rounded">
                                  {t.subject}
                                </span>
                              </div>
                            ) : (
                              /* Standard Task Bar with Drag Handles */
                              <motion.div
                                initial={{ scaleX: 0.9, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                className={`relative h-6 rounded-xl border flex items-center justify-between px-2 text-[10px] font-extrabold shadow-2xs transition-all z-10 ${
                                  isSkipped
                                    ? 'bg-purple-50 border-purple-300 text-purple-900 line-through opacity-70'
                                    : isCritical
                                    ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-500/20'
                                    : t.status === 'Completed'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : ryg === 'Red'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : ryg === 'Yellow'
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
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
                                    isCritical
                                      ? 'bg-rose-500'
                                      : t.status === 'Completed'
                                      ? 'bg-emerald-500'
                                      : ryg === 'Red'
                                      ? 'bg-rose-500'
                                      : 'bg-sky-500'
                                  }`}
                                  style={{ width: `${Math.min(t.progress || 0, 100)}%` }}
                                />

                                {/* Label & Progress */}
                                <span
                                  className="truncate max-w-[120px] z-10 font-bold flex items-center gap-1"
                                  title={t.subject}
                                >
                                  {isBlocked && (
                                    <span title="Blocked by predecessor deliverable">
                                      <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                                    </span>
                                  )}
                                  {hasDeps && !isBlocked && (
                                    <span title="Linked to task dependencies">
                                      <GitFork className="h-2.5 w-2.5 text-sky-600 shrink-0" />
                                    </span>
                                  )}
                                  <span className="truncate">{t.subject}</span>
                                </span>
                                <span className="font-mono z-10 shrink-0 font-black">{t.progress || 0}%</span>
                              </motion.div>
                            )}

                            {/* Baseline Snapshot Reference Bar */}
                            {baselineBarSpan && (
                              <div
                                className="relative h-2 rounded-md bg-amber-200/90 border border-amber-500 border-dashed z-0 opacity-80 transition-all"
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
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialogs */}
      {isCreateTaskOpen && onCreateCustomTask && (
        <CreateCustomTaskDialog
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          projectId={activeProjectId}
          teamMembers={teamMembers}
          onSubmit={onCreateCustomTask}
        />
      )}

      {isCreateMilestoneOpen && onCreateCustomMilestone && (
        <CreateCustomMilestoneDialog
          isOpen={isCreateMilestoneOpen}
          onClose={() => setIsCreateMilestoneOpen(false)}
          projectId={activeProjectId}
          onSubmit={onCreateCustomMilestone}
        />
      )}

      {retimingTask && onRetimeTask && (
        <RetimeTaskDialog
          isOpen={Boolean(retimingTask)}
          onClose={() => setRetimingTask(null)}
          task={retimingTask}
          onRetime={onRetimeTask}
        />
      )}

      {isImportOpen && onImportTasks && (
        <ImportMspDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          projectId={activeProjectId}
          projectName={activeProjectName}
          onImportTasks={onImportTasks}
        />
      )}
    </div>
  );
}
