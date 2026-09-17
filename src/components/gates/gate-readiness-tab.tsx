'use client';

import React, { useState, useMemo } from 'react';
import { Task } from '@/types/task.types';
import { useUpdateTask } from '@/hooks/use-tasks';
import { useToast } from '@/providers/toast-context';
import {
  INTEVA_GATE_CHOICES,
  BOARD_FUNCTIONS,
  IntevaGateCode,
} from '@/config/gate-choices.config';
import {
  calculateGateReadiness,
  filterChildTasks,
  getApplicableRetimeGates,
  getBaseGate,
  getEffectiveGate,
  isTaskSkipped,
} from '@/services/gate-readiness.service';
import { TaskAttachmentModal } from './task-attachment-modal';
import {
  Search,
  Filter,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRight,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface GateReadinessTabProps {
  tasks: Task[];
  projectId?: string;
  projectName?: string;
  selectedGateFilter?: string;
  onGateFilterChange?: (gate: string) => void;
  canEdit?: boolean;
  onRefresh?: () => void;
}

export function GateReadinessTab({
  tasks,
  projectId,
  projectName,
  selectedGateFilter = 'ALL',
  onGateFilterChange,
  canEdit = true,
  onRefresh,
}: GateReadinessTabProps) {
  const { showToast } = useToast();
  const updateTaskMutation = useUpdateTask();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [functionFilter, setFunctionFilter] = useState('ALL');
  const [expandedGates, setExpandedGates] = useState<Record<string, boolean>>({
    '1. PL': true,
    '2. VC': true,
    '3. TKO': true,
    '4. VL': true,
    '5. CPA': true,
    '6. CT': true,
  });
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});

  // Active Attachment Modal Task
  const [attachmentModalTask, setAttachmentModalTask] = useState<Task | null>(null);

  // Filter Child Tasks Only (Parent tasks must remain hidden)
  const childTasks = useMemo(() => filterChildTasks(tasks), [tasks]);

  // Calculations across all 6 gates
  const gateCalculations = useMemo(() => {
    const results: Record<string, ReturnType<typeof calculateGateReadiness>> = {};
    for (const gate of INTEVA_GATE_CHOICES) {
      results[gate] = calculateGateReadiness(childTasks, gate);
    }
    return results;
  }, [childTasks]);

  const toggleGate = (gate: string) => {
    setExpandedGates((prev) => ({ ...prev, [gate]: !prev[gate] }));
  };

  const toggleFunction = (key: string) => {
    setExpandedFunctions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle inline updates
  const handleUpdateField = async (task: Task, updates: Partial<Task>) => {
    if (!canEdit) return;
    try {
      await updateTaskMutation.mutateAsync({
        name: task.name,
        data: updates,
      });
      showToast(`Task ${task.name} updated`, 'success');
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  // Determine which gates to display based on selected filter
  const displayedGates = useMemo(() => {
    if (selectedGateFilter === 'ALL') {
      return [...INTEVA_GATE_CHOICES];
    }
    return INTEVA_GATE_CHOICES.filter((g) => g === selectedGateFilter);
  }, [selectedGateFilter]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Gate Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gate:</span>
            <select
              value={selectedGateFilter}
              onChange={(e) => onGateFilterChange?.(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Gates (1. PL → 6. CT)</option>
              {INTEVA_GATE_CHOICES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Function Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Function:</span>
            <select
              value={functionFilter}
              onChange={(e) => setFunctionFilter(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Functions</option>
              {BOARD_FUNCTIONS.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search task name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Gate Sections List */}
      <div className="space-y-6">
        {displayedGates.map((gateCode) => {
          const gateData = gateCalculations[gateCode];
          const isExpanded = !!expandedGates[gateCode];

          // Filter by function and search query
          const functionEntries = Object.entries(gateData.functionBreakdown).filter(
            ([fnName, fnData]) => {
              if (functionFilter !== 'ALL' && fnName !== functionFilter) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return fnData.tasks.some(
                  (t) =>
                    (t.subject || '').toLowerCase().includes(q) ||
                    (t.name || '').toLowerCase().includes(q) ||
                    (t.custom_wbs || t.wbs || '').toLowerCase().includes(q)
                );
              }
              return true;
            }
          );

          return (
            <div
              key={gateCode}
              className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition"
            >
              {/* Gate Header Accordion */}
              <div
                onClick={() => toggleGate(gateCode)}
                className="px-6 py-4.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {gateCode}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        ({gateData.totalChildTasks} Tasks
                        {gateData.retimedInTasksCount > 0 && ` • ${gateData.retimedInTasksCount} Retimed In`}
                        {gateData.retimedOutTasksCount > 0 && ` • ${gateData.retimedOutTasksCount} Retimed Out`}
                        )
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gate Overall Readiness Progress Bar */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Gate Readiness
                    </div>
                    <div className="text-sm font-mono font-black text-slate-800">
                      {gateData.readinessPercentage}%
                    </div>
                  </div>
                  <div className="w-28 sm:w-36 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500 rounded-full',
                        gateData.readinessPercentage >= 100
                          ? 'bg-emerald-500'
                          : gateData.readinessPercentage >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      )}
                      style={{ width: `${Math.min(100, gateData.readinessPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Gate Body: Functions and Tasks */}
              {isExpanded && (
                <div className="p-6 space-y-6">
                  {functionEntries.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium">
                      No tasks found for Gate {gateCode} matching active filters.
                    </div>
                  ) : (
                    functionEntries.map(([fnName, fnData]) => {
                      const fnKey = `${gateCode}_${fnName}`;
                      const isFnExpanded = expandedFunctions[fnKey] !== false; // default expanded

                      // Filter tasks by search
                      const visibleTasks = fnData.tasks.filter((t) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          (t.subject || '').toLowerCase().includes(q) ||
                          (t.name || '').toLowerCase().includes(q) ||
                          (t.custom_wbs || t.wbs || '').toLowerCase().includes(q)
                        );
                      });

                      return (
                        <div
                          key={fnKey}
                          className="border border-slate-200 rounded-2xl overflow-hidden"
                        >
                          {/* Function Subheader */}
                          <div
                            onClick={() => toggleFunction(fnKey)}
                            className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/50 transition"
                          >
                            <div className="flex items-center gap-2">
                              {isFnExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                                Function: {fnName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                ({fnData.totalTasks} tasks • {fnData.activeTasks} active)
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 font-medium">
                                Function Readiness:
                              </span>
                              <span
                                className={cn(
                                  'font-mono text-xs font-bold px-2 py-0.5 rounded-md',
                                  fnData.readinessPercentage >= 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : fnData.readinessPercentage >= 60
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                )}
                              >
                                {fnData.readinessPercentage}%
                              </span>
                            </div>
                          </div>

                          {/* Tasks Table */}
                          {isFnExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Task ID / WBS</th>
                                    <th className="py-2.5 px-3">Task Name</th>
                                    <th className="py-2.5 px-3">Function</th>
                                    <th className="py-2.5 px-3">Start Date</th>
                                    <th className="py-2.5 px-3">End Date</th>
                                    <th className="py-2.5 px-3 text-center">Gate Readiness %</th>
                                    <th className="py-2.5 px-3 text-center">Skipped Task</th>
                                    <th className="py-2.5 px-3">Retimed To</th>
                                    <th className="py-2.5 px-3 text-center">Evidence</th>
                                    <th className="py-2.5 px-3 text-center">Document Attachment</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {visibleTasks.map((t) => {
                                    const isSkipped = isTaskSkipped(t);
                                    const baseGate = getBaseGate(t);
                                    const retimedTo = t.custom_retimed_to || t.retimed_to || '';
                                    const applicableFutureGates = getApplicableRetimeGates(
                                      baseGate || gateCode
                                    );
                                    const taskProgress =
                                      typeof t.progress === 'number' ? t.progress : 0;

                                    return (
                                      <tr
                                        key={t.name}
                                        className={cn(
                                          'hover:bg-slate-50/70 transition',
                                          isSkipped && 'bg-slate-50/40 opacity-60'
                                        )}
                                      >
                                        {/* Task ID / WBS */}
                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                          {t.custom_wbs || t.wbs || t.name}
                                        </td>

                                        {/* Task Name */}
                                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[280px]">
                                          <div className="truncate" title={t.subject}>
                                            {t.subject}
                                          </div>
                                        </td>

                                        {/* Function */}
                                        <td className="py-2.5 px-3">
                                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                            {t.custom_function || t.function_name || fnName}
                                          </span>
                                        </td>

                                        {/* Start Date */}
                                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                          {t.exp_start_date || t.actual_start_date || 'N/A'}
                                        </td>

                                        {/* End Date */}
                                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                          {t.exp_end_date || t.actual_end_date || 'N/A'}
                                        </td>

                                        {/* Gate Readiness % */}
                                        <td className="py-2.5 px-3 text-center">
                                          {isSkipped ? (
                                            <span className="text-[11px] text-slate-400 italic">
                                              Excluded
                                            </span>
                                          ) : (
                                            <div className="flex items-center justify-center gap-1.5">
                                              <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                disabled={!canEdit}
                                                defaultValue={taskProgress}
                                                onBlur={(e) => {
                                                  const val = Math.max(
                                                    0,
                                                    Math.min(100, Number(e.target.value))
                                                  );
                                                  if (val !== taskProgress) {
                                                    handleUpdateField(t, { progress: val });
                                                  }
                                                }}
                                                className="w-14 text-center font-mono font-bold text-xs py-1 px-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                                              />
                                              <span className="text-slate-400 font-bold">%</span>
                                            </div>
                                          )}
                                        </td>

                                        {/* Skipped Task */}
                                        <td className="py-2.5 px-3 text-center">
                                          <select
                                            disabled={!canEdit}
                                            value={isSkipped ? 'Skipped' : '-'}
                                            onChange={(e) => {
                                              const willSkip = e.target.value === 'Skipped';
                                              handleUpdateField(t, {
                                                is_skipped: willSkip,
                                                custom_is_skipped: willSkip ? 1 : 0,
                                                status: willSkip ? 'Skipped' : 'Open',
                                              });
                                            }}
                                            className={cn(
                                              'text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer',
                                              isSkipped
                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                : 'bg-slate-50 text-slate-700 border-slate-200'
                                            )}
                                          >
                                            <option value="-">-</option>
                                            <option value="Skipped">Skipped</option>
                                          </select>
                                        </td>

                                        {/* Retimed To (Future applicable gates only) */}
                                        <td className="py-2.5 px-3">
                                          <select
                                            disabled={!canEdit}
                                            value={retimedTo || ''}
                                            onChange={(e) => {
                                              const newRetime = e.target.value;
                                              handleUpdateField(t, {
                                                retimed_to: newRetime,
                                                custom_retimed_to: newRetime,
                                              });
                                            }}
                                            className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white cursor-pointer"
                                          >
                                            <option value="">(Current Gate)</option>
                                            {applicableFutureGates.map((g) => (
                                              <option key={g} value={g}>
                                                Retime → {g}
                                              </option>
                                            ))}
                                          </select>
                                        </td>

                                        {/* Evidence Indicator */}
                                        <td className="py-2.5 px-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => setAttachmentModalTask(t)}
                                            className={cn(
                                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer',
                                              'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                            )}
                                            title="View evidence attachments"
                                          >
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            <span>Attached</span>
                                          </button>
                                        </td>

                                        {/* Document Attachment Button */}
                                        <td className="py-2.5 px-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => setAttachmentModalTask(t)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition cursor-pointer"
                                          >
                                            <Paperclip className="h-3.5 w-3.5" />
                                            <span>Docs</span>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Document Attachment Modal */}
      {attachmentModalTask && (
        <TaskAttachmentModal
          isOpen={!!attachmentModalTask}
          onClose={() => setAttachmentModalTask(null)}
          task={attachmentModalTask}
          projectId={projectId}
          onAttachmentsChanged={onRefresh}
        />
      )}
    </div>
  );
}
