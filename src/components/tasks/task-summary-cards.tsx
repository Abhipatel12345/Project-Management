import React from 'react';
import { TaskSummary } from '@/types/task.types';
import { Layers, Clock, Activity, CheckCircle2, AlertTriangle, UserX } from 'lucide-react';

interface TaskSummaryCardsProps {
  summary: TaskSummary;
}

export function TaskSummaryCards({ summary }: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sans">
      {/* Total Tasks */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Total Tasks</span>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">{summary.totalTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Work packages</div>
      </div>

      {/* Open */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Open Tasks</span>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-sky-600">{summary.openTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Awaiting start</div>
      </div>

      {/* In Progress */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>In Progress</span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-blue-600">{summary.inProgressTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Active engineering</div>
      </div>

      {/* Completed */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Completed</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-emerald-600">{summary.completedTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Delivered & verified</div>
      </div>

      {/* Overdue */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Overdue</span>
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-rose-600">{summary.overdueTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Past target date</div>
      </div>

      {/* Unassigned */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Unassigned</span>
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            <UserX className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-700">{summary.unassignedTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Needs team owner</div>
      </div>
    </div>
  );
}
