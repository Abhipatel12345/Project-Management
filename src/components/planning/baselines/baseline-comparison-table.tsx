import React, { useState, useMemo } from 'react';
import { ProjectBaseline, TaskBaselineComparison, VarianceStatus } from '@/types/baseline.types';
import {
  Search,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Filter,
  Calendar,
  Layers,
  User,
  XCircle,
} from 'lucide-react';

interface BaselineComparisonTableProps {
  comparisons: TaskBaselineComparison[];
  baseline: ProjectBaseline;
  onCloseCompareMode?: () => void;
}

export function BaselineComparisonTable({
  comparisons,
  baseline,
  onCloseCompareMode,
}: BaselineComparisonTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Summary Metrics
  const total = comparisons.length;
  const onTimeCount = comparisons.filter((c) => c.variance_status === 'On Time').length;
  const delayedCount = comparisons.filter((c) => c.variance_status === 'Delayed').length;
  const aheadCount = comparisons.filter((c) => c.variance_status === 'Ahead').length;

  // Filtered comparison list
  const filteredComparisons = useMemo(() => {
    let result = [...comparisons];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.task_subject.toLowerCase().includes(q) ||
          c.task_id.toLowerCase().includes(q) ||
          (c.assigned_to && c.assigned_to.toLowerCase().includes(q))
      );
    }

    if (varianceFilter !== 'ALL') {
      result = result.filter((c) => c.variance_status === varianceFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((c) => c.priority === priorityFilter);
    }

    return result;
  }, [comparisons, searchQuery, varianceFilter, priorityFilter]);

  const renderVarianceBadge = (days: number, label: string) => {
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> On Time
        </span>
      );
    }
    if (days > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <TrendingUp className="h-3 w-3 text-rose-500" /> +{days} days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
        <TrendingDown className="h-3 w-3 text-sky-500" /> {days} days
      </span>
    );
  };

  const renderStatusBadge = (status: VarianceStatus) => {
    switch (status) {
      case 'On Time':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> On Time
          </span>
        );
      case 'Delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3 text-rose-600" /> Delayed
          </span>
        );
      case 'Ahead':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300 uppercase tracking-wider">
            <TrendingDown className="h-3 w-3 text-sky-600" /> Ahead
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            Unscheduled
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans border-t border-slate-200 pt-6">
      {/* Top Banner Header & Metric Cards */}
      <div className="bg-white text-slate-800 p-6 rounded-3xl space-y-4 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
                SCHEDULE VARIANCE ANALYSIS
              </span>
              <span className="text-[10px] font-bold text-slate-400">• Plan vs Actual Comparison</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {baseline.baseline_name} (Baseline #{baseline.baseline_number}) vs Current Schedule
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Frozen on <strong className="text-slate-800 font-bold">{baseline.snapshot_date}</strong> by <strong className="text-slate-800 font-bold">{baseline.created_by}</strong> ({baseline.task_count} Tasks captured)
            </p>
          </div>

          {onCloseCompareMode && (
            <button
              onClick={onCloseCompareMode}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200 self-start md:self-auto"
            >
              Exit Comparison
            </button>
          )}
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Total Tasks</div>
            <div className="text-xl font-black text-slate-900">{total}</div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-0.5">
            <div className="text-[10px] text-emerald-800 font-extrabold uppercase flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> On Time
            </div>
            <div className="text-xl font-black text-emerald-700">{onTimeCount}</div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-0.5">
            <div className="text-[10px] text-rose-800 font-extrabold uppercase flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-600" /> Delayed
            </div>
            <div className="text-xl font-black text-rose-700">{delayedCount}</div>
          </div>

          <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-0.5">
            <div className="text-[10px] text-sky-800 font-extrabold uppercase flex items-center justify-center gap-1">
              <TrendingDown className="h-3 w-3 text-sky-600" /> Ahead of Plan
            </div>
            <div className="text-xl font-black text-sky-700">{aheadCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task subject, ID, assignee..."
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        <select
          value={varianceFilter}
          onChange={(e) => setVarianceFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Variance Statuses</option>
          <option value="Delayed">Delayed Tasks</option>
          <option value="On Time">On Time Tasks</option>
          <option value="Ahead">Ahead Tasks</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
          <option value="Urgent">Urgent / Critical</option>
        </select>
      </div>

      {/* Comparison Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Task ID & Subject</th>
                <th className="py-3.5 px-4">Baseline Start → Current Start</th>
                <th className="py-3.5 px-4 text-center">Start Variance</th>
                <th className="py-3.5 px-4">Baseline End → Current End</th>
                <th className="py-3.5 px-4 text-center">End Variance</th>
                <th className="py-3.5 px-4 text-center">Duration</th>
                <th className="py-3.5 px-4 text-center">Schedule Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredComparisons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-2">
                    <XCircle className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No task comparisons found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredComparisons.map((c) => (
                  <tr key={c.task_id} className="hover:bg-slate-50/80 transition">
                    {/* ID & Subject */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 line-clamp-1 max-w-[200px]" title={c.task_subject}>
                          {c.task_subject}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-sky-700">{c.task_id}</div>
                      </div>
                    </td>

                    {/* Start Dates */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span>{c.baseline_start}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <strong className="text-slate-900 font-bold">{c.current_start}</strong>
                      </div>
                    </td>

                    {/* Start Variance */}
                    <td className="py-3 px-4 text-center">
                      {renderVarianceBadge(c.start_variance, 'Start')}
                    </td>

                    {/* End Dates */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span>{c.baseline_end}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <strong className="text-slate-900 font-bold">{c.current_end}</strong>
                      </div>
                    </td>

                    {/* End Variance */}
                    <td className="py-3 px-4 text-center">
                      {renderVarianceBadge(c.end_variance, 'End')}
                    </td>

                    {/* Duration Variance */}
                    <td className="py-3 px-4 text-center font-mono text-[11px]">
                      <div className="text-slate-800 font-bold">
                        {c.baseline_duration}d → {c.current_duration}d
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {c.duration_variance === 0
                          ? 'No change'
                          : c.duration_variance > 0
                          ? `+${c.duration_variance}d longer`
                          : `${c.duration_variance}d shorter`}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(c.variance_status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
