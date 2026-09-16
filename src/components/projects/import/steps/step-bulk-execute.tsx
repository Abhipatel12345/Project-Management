'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, FolderKanban, Terminal } from 'lucide-react';

interface StepBulkExecuteProps {
  progressPercentage: number;
  currentProjectIndex: number;
  totalProjects: number;
  currentProjectName: string;
  tasksCreated: number;
  totalTasks: number;
  logs: string[];
  isCompleted: boolean;
  error?: string | null;
}

export function StepBulkExecute({
  progressPercentage,
  currentProjectIndex,
  totalProjects,
  currentProjectName,
  tasksCreated,
  totalTasks,
  logs,
  isCompleted,
  error,
}: StepBulkExecuteProps) {
  return (
    <div className="space-y-6 py-4">
      {/* Central Progress Card */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-md text-center max-w-2xl mx-auto space-y-6">
        <div className="inline-flex p-4 rounded-3xl bg-sky-50 border border-sky-200 text-sky-600 shadow-sm animate-pulse">
          <FolderKanban className="h-10 w-10" />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900">
            {isCompleted
              ? 'Bulk Project Creation Completed!'
              : 'Creating Projects in ERPNext & PDM Database...'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isCompleted
              ? 'All projects, phases, tasks, and deliverables have been initialized successfully.'
              : `Processing project ${currentProjectIndex} of ${totalProjects}: "${currentProjectName}"`}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-600">Overall Progress</span>
            <span className="text-sky-600 font-extrabold">{progressPercentage}%</span>
          </div>

          <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${Math.max(5, progressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Real-time counters */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Projects Progress
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {currentProjectIndex} / {totalProjects}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Tasks Created
            </div>
            <div className="text-lg font-black text-sky-600 mt-0.5">
              {tasksCreated} / {totalTasks}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-left flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Live Log Stream Terminal */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 shadow-sm overflow-hidden text-left max-w-2xl mx-auto">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-mono text-[11px] font-bold text-slate-300">
              Execution Stream
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>TRANSACTION ACTIVE</span>
          </div>
        </div>

        <div className="p-4 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-48 overflow-y-auto">
          {logs.map((log, lIdx) => (
            <div key={lIdx} className="leading-relaxed flex items-start gap-2">
              <span className="text-slate-600 select-none">&gt;</span>
              <span
                className={
                  log.includes('FAILED') || log.includes('Error')
                    ? 'text-rose-400'
                    : log.includes('Created')
                    ? 'text-emerald-300'
                    : log.includes('Skipped')
                    ? 'text-amber-300'
                    : 'text-slate-300'
                }
              >
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
