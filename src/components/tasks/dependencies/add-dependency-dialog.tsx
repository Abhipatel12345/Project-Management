'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task.types';
import { DependencyType } from '@/types/task-dependency.types';
import { useCreateDependency } from '@/hooks/use-task-dependencies';
import { useToast } from '@/providers/toast-context';
import {
  X,
  GitFork,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Info,
} from 'lucide-react';

interface AddDependencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  tasks: Task[];
  initialPredecessorId?: string;
  initialSuccessorId?: string;
  onSuccess?: () => void;
}

const DEPENDENCY_TYPES: { type: DependencyType; label: string; short: string; description: string }[] = [
  {
    type: 'FS',
    label: 'Finish-to-Start (FS)',
    short: 'FS',
    description: 'Successor task can start only after Predecessor finishes.',
  },
  {
    type: 'SS',
    label: 'Start-to-Start (SS)',
    short: 'SS',
    description: 'Successor task can start when Predecessor starts.',
  },
  {
    type: 'FF',
    label: 'Finish-to-Finish (FF)',
    short: 'FF',
    description: 'Successor task can finish when Predecessor finishes.',
  },
  {
    type: 'SF',
    label: 'Start-to-Finish (SF)',
    short: 'SF',
    description: 'Successor task can finish only after Predecessor starts.',
  },
];

export function AddDependencyDialog({
  isOpen,
  onClose,
  projectId,
  tasks,
  initialPredecessorId,
  initialSuccessorId,
  onSuccess,
}: AddDependencyDialogProps) {
  const { showToast } = useToast();
  const createMutation = useCreateDependency();

  const [predecessorId, setPredecessorId] = useState<string>(initialPredecessorId || '');
  const [successorId, setSuccessorId] = useState<string>(initialSuccessorId || '');
  const [dependencyType, setDependencyType] = useState<DependencyType>('FS');
  const [lagDays, setLagDays] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const predTask = tasks.find((t) => t.name === predecessorId);
  const succTask = tasks.find((t) => t.name === successorId);

  const selectedTypeInfo = DEPENDENCY_TYPES.find((d) => d.type === dependencyType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!predecessorId) {
      setErrorMessage('Please select a predecessor task.');
      return;
    }
    if (!successorId) {
      setErrorMessage('Please select a successor task.');
      return;
    }
    if (predecessorId === successorId) {
      setErrorMessage('Cannot create dependency: a task cannot depend on itself.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        project: projectId,
        predecessor_id: predecessorId,
        successor_id: successorId,
        dependency_type: dependencyType,
        lag_days: Number(lagDays) || 0,
      });

      showToast(`Task relationship created successfully!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          err.response?.data?.error ||
          'Failed to create task dependency. Please check for circular relationships.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Add Task Dependency</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Define execution sequence between deliverables
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-bold">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Predecessor Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>1. Predecessor Task (Must Happen First)</span>
              <span className="text-[10px] text-slate-400 font-normal">Source</span>
            </label>
            <select
              value={predecessorId}
              onChange={(e) => {
                setPredecessorId(e.target.value);
                setErrorMessage(null);
              }}
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
            >
              <option value="">Select predecessor task...</option>
              {tasks.map((t) => (
                <option key={t.name} value={t.name} disabled={t.name === successorId}>
                  {t.name} — {t.subject} ({t.status})
                </option>
              ))}
            </select>
          </div>

          {/* Successor Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>2. Successor Task (Depends on Predecessor)</span>
              <span className="text-[10px] text-slate-400 font-normal">Target</span>
            </label>
            <select
              value={successorId}
              onChange={(e) => {
                setSuccessorId(e.target.value);
                setErrorMessage(null);
              }}
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
            >
              <option value="">Select successor task...</option>
              {tasks.map((t) => (
                <option key={t.name} value={t.name} disabled={t.name === predecessorId}>
                  {t.name} — {t.subject} ({t.status})
                </option>
              ))}
            </select>
          </div>

          {/* Dependency Type Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700">3. Dependency Type</label>
            <div className="grid grid-cols-2 gap-2">
              {DEPENDENCY_TYPES.map((dt) => (
                <button
                  key={dt.type}
                  type="button"
                  onClick={() => setDependencyType(dt.type)}
                  className={`p-2.5 text-left rounded-xl border transition cursor-pointer ${
                    dependencyType === dt.type
                      ? 'bg-sky-50/80 border-sky-500 text-sky-900 shadow-2xs font-bold ring-1 ring-sky-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{dt.short}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {dt.type === 'FS' ? 'Default' : ''}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                    {dt.label}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5 pt-1">
              <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>{selectedTypeInfo.description}</span>
            </p>
          </div>

          {/* Relationship Preview Card */}
          {predTask && succTask && (
            <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                Relationship Preview
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800">
                <div className="p-2 rounded-xl bg-white border border-sky-100 flex-1 truncate shadow-2xs">
                  <span className="text-[10px] font-mono text-slate-400 block">{predTask.name}</span>
                  <span className="truncate block font-bold text-slate-900">{predTask.subject}</span>
                </div>
                <div className="flex flex-col items-center px-1 text-sky-600">
                  <span className="text-[10px] font-black">{dependencyType}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="p-2 rounded-xl bg-white border border-sky-100 flex-1 truncate shadow-2xs">
                  <span className="text-[10px] font-mono text-slate-400 block">{succTask.name}</span>
                  <span className="truncate block font-bold text-slate-900">{succTask.subject}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Dependency</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
