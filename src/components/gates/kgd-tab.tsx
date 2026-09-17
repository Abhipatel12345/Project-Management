'use client';

import React, { useState, useMemo } from 'react';
import { Task } from '@/types/task.types';
import { useUpdateTask } from '@/hooks/use-tasks';
import { useToast } from '@/providers/toast-context';
import { INTEVA_GATE_CHOICES, IntevaGateCode } from '@/config/gate-choices.config';
import {
  calculateKgdIndicator,
  filterChildTasks,
  getApplicableRetimeGates,
  getBaseGate,
  getEffectiveGate,
  getPmoGateConfig,
  setPmoGateConfig,
  isMandatoryKgdTask,
  isTaskSkipped,
  PmoGateConfig,
} from '@/services/gate-readiness.service';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface KgdTabProps {
  tasks: Task[];
  projectId?: string;
  projectName?: string;
  selectedGateFilter?: string;
  onGateFilterChange?: (gate: string) => void;
  canEdit?: boolean;
  onRefresh?: () => void;
}

export function KgdTab({
  tasks,
  projectId,
  projectName,
  selectedGateFilter = 'ALL',
  onGateFilterChange,
  canEdit = true,
  onRefresh,
}: KgdTabProps) {
  const { showToast } = useToast();
  const updateTaskMutation = useUpdateTask();

  // Search and PMO Config States
  const [searchQuery, setSearchQuery] = useState('');
  const [pmoConfig, setConfigState] = useState<PmoGateConfig>(getPmoGateConfig());
  const [isPmoSettingsOpen, setIsPmoSettingsOpen] = useState(false);
  const [tempXValue, setTempXValue] = useState<number>(pmoConfig.kgdGreenDaysEarlyThreshold);

  const [expandedGates, setExpandedGates] = useState<Record<string, boolean>>({
    '1. PL': true,
    '2. VC': true,
    '3. TKO': true,
    '4. VL': true,
    '5. CPA': true,
    '6. CT': true,
  });

  // Filter Child Tasks + Mandatory KGD Tasks Only
  const kgdTasks = useMemo(() => {
    const childs = filterChildTasks(tasks);
    return childs.filter(isMandatoryKgdTask);
  }, [tasks]);

  const toggleGate = (gate: string) => {
    setExpandedGates((prev) => ({ ...prev, [gate]: !prev[gate] }));
  };

  // Handle saving PMO configuration threshold
  const handleSavePmoConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = setPmoGateConfig({ kgdGreenDaysEarlyThreshold: tempXValue });
    setConfigState(updated);
    setIsPmoSettingsOpen(false);
    showToast(
      `PMO KGD Rule updated: Tasks finishing > ${tempXValue} days early qualify as Green.`,
      'success'
    );
  };

  // Group KGD tasks by effective Gate
  const gateGroups = useMemo(() => {
    const groups: Record<
      IntevaGateCode,
      {
        total: number;
        completed: number;
        greenCount: number;
        yellowCount: number;
        redCount: number;
        skippedCount: number;
        tasks: Task[];
      }
    > = {
      '1. PL': { total: 0, completed: 0, greenCount: 0, yellowCount: 0, redCount: 0, skippedCount: 0, tasks: [] },
      '2. VC': { total: 0, completed: 0, greenCount: 0, yellowCount: 0, redCount: 0, skippedCount: 0, tasks: [] },
      '3. TKO': { total: 0, completed: 0, greenCount: 0, yellowCount: 0, redCount: 0, skippedCount: 0, tasks: [] },
      '4. VL': { total: 0, completed: 0, greenCount: 0, yellowCount: 0, redCount: 0, skippedCount: 0, tasks: [] },
      '5. CPA': { total: 0, completed: 0, greenCount: 0, yellowCount: 0, redCount: 0, skippedCount: 0, tasks: [] },
      '6. CT': { total: 0, completed: 0, greenCount: 0, yellowCount: 0, redCount: 0, skippedCount: 0, tasks: [] },
    };

    for (const t of kgdTasks) {
      const effectiveGate = getEffectiveGate(t) || '1. PL';
      if (groups[effectiveGate]) {
        groups[effectiveGate].tasks.push(t);
        groups[effectiveGate].total++;

        const indicator = calculateKgdIndicator(t, pmoConfig);
        if (indicator.color === 'GREEN') groups[effectiveGate].greenCount++;
        else if (indicator.color === 'YELLOW') groups[effectiveGate].yellowCount++;
        else if (indicator.color === 'RED') groups[effectiveGate].redCount++;
        else if (indicator.color === 'SKIPPED') groups[effectiveGate].skippedCount++;

        if (t.progress === 100 || (t.status || '').toLowerCase() === 'completed') {
          groups[effectiveGate].completed++;
        }
      }
    }

    return groups;
  }, [kgdTasks, pmoConfig]);

  // Handle inline updates
  const handleUpdateField = async (task: Task, updates: Partial<Task>) => {
    if (!canEdit) return;
    try {
      await updateTaskMutation.mutateAsync({
        name: task.name,
        data: updates,
      });
      showToast(`KGD Deliverable ${task.name} updated`, 'success');
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to update deliverable', 'error');
    }
  };

  const displayedGates = useMemo(() => {
    if (selectedGateFilter === 'ALL') return [...INTEVA_GATE_CHOICES];
    return INTEVA_GATE_CHOICES.filter((g) => g === selectedGateFilter);
  }, [selectedGateFilter]);

  return (
    <div className="space-y-6">
      {/* Filter and PMO Settings Bar */}
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

          {/* PMO Rules Configuration Button */}
          <button
            type="button"
            onClick={() => {
              setTempXValue(pmoConfig.kgdGreenDaysEarlyThreshold);
              setIsPmoSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            <span>PMO Threshold (X = {pmoConfig.kgdGreenDaysEarlyThreshold}d)</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search KGD task name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* PMO Configuration Modal */}
      {isPmoSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">PMO Governance Configuration</h3>
              </div>
            </div>

            <form onSubmit={handleSavePmoConfig} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Define the PMO parameter <strong>X</strong> for Key Gate Deliverables (KGD). If a task's current finish date is more than <strong>X</strong> days before its target finish, it qualifies for the <strong>Green</strong> indicator.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Green Indicator Threshold (X Days Early):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    required
                    value={tempXValue}
                    onChange={(e) => setTempXValue(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                  <span className="text-slate-500 font-medium">days before target finish</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Standard PMO baseline: 5 days early.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold text-slate-800">KGD Indicator Rules:</div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    <strong>Green:</strong> Completed on time OR finish is &gt; {tempXValue} days before target.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>
                    <strong>Yellow:</strong> Incomplete and within 3–10 days of planned finish.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>
                    <strong>Red:</strong> Incomplete and within 0–2 days or overdue.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPmoSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Save PMO Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gate Sections List */}
      <div className="space-y-6">
        {displayedGates.map((gateCode) => {
          const group = gateGroups[gateCode];
          const isExpanded = !!expandedGates[gateCode];

          const filteredTasks = group.tasks.filter((t) => {
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
              key={gateCode}
              className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition"
            >
              {/* Gate Accordion Header */}
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-slate-900">
                      {gateCode}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      ({group.total} Mandatory KGDs • {group.completed} Complete)
                    </span>
                  </div>
                </div>

                {/* Health Indicator Counters */}
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {group.greenCount} Green
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {group.yellowCount} Yellow
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {group.redCount} Red
                  </span>
                  {group.skippedCount > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {group.skippedCount} Skipped
                    </span>
                  )}
                </div>
              </div>

              {/* Table */}
              {isExpanded && (
                <div className="p-6">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium">
                      No mandatory KGD tasks found for Gate {gateCode}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-3">Task ID</th>
                            <th className="py-3 px-3">Task Name</th>
                            <th className="py-3 px-3">Function</th>
                            <th className="py-3 px-3">Current Start</th>
                            <th className="py-3 px-3">Current Finish</th>
                            <th className="py-3 px-3 text-center">% Complete</th>
                            <th className="py-3 px-3 text-center">Skipped Task</th>
                            <th className="py-3 px-3">Retimed To</th>
                            <th className="py-3 px-3 text-center">KGD Indicator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTasks.map((t) => {
                            const isSkipped = isTaskSkipped(t);
                            const baseGate = getBaseGate(t);
                            const retimedTo = t.custom_retimed_to || t.retimed_to || '';
                            const applicableFutureGates = getApplicableRetimeGates(
                              baseGate || gateCode
                            );
                            const taskProgress =
                              typeof t.progress === 'number' ? t.progress : 0;
                            const indicator = calculateKgdIndicator(t, pmoConfig);

                            return (
                              <tr
                                key={t.name}
                                className={cn(
                                  'hover:bg-slate-50/70 transition',
                                  isSkipped && 'bg-slate-50/40 opacity-60'
                                )}
                              >
                                {/* Task ID */}
                                <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                  {t.custom_wbs || t.wbs || t.name}
                                </td>

                                {/* Task Name */}
                                <td className="py-3 px-3 font-medium text-slate-800 max-w-[280px]">
                                  <div className="truncate" title={t.subject}>
                                    {t.subject}
                                  </div>
                                </td>

                                {/* Function */}
                                <td className="py-3 px-3">
                                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {t.custom_function || t.function_name || 'PM'}
                                  </span>
                                </td>

                                {/* Current Start Date */}
                                <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {t.exp_start_date || t.actual_start_date || 'N/A'}
                                </td>

                                {/* Current Finish Date */}
                                <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {t.exp_end_date || t.actual_end_date || 'N/A'}
                                </td>

                                {/* % Complete */}
                                <td className="py-3 px-3 text-center">
                                  {isSkipped ? (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Skipped
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
                                <td className="py-3 px-3 text-center">
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

                                {/* Retimed To */}
                                <td className="py-3 px-3">
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

                                {/* KGD Indicator */}
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border',
                                      indicator.color === 'GREEN' &&
                                        'bg-emerald-50 text-emerald-700 border-emerald-200',
                                      indicator.color === 'YELLOW' &&
                                        'bg-amber-50 text-amber-700 border-amber-200',
                                      indicator.color === 'RED' &&
                                        'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
                                      indicator.color === 'SKIPPED' &&
                                        'bg-slate-100 text-slate-500 border-slate-200'
                                    )}
                                    title={indicator.reason}
                                  >
                                    {indicator.color === 'GREEN' && (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    )}
                                    {indicator.color === 'YELLOW' && (
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                    )}
                                    {indicator.color === 'RED' && (
                                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                    )}
                                    <span>{indicator.label}</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
