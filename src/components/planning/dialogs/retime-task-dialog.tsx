'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task.types';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { formatDate } from '@/utils/gantt-scheduling-engine';

interface RetimeTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onRetime: (task: Task, retimedToGate: string, newStart: string, newEnd: string, reason: string) => Promise<void>;
}

const AUTHORITATIVE_GATES = ['1. PL', '2. VC', '3. TKO', '4. VL', '5. CPA', '6. CT'];

export function RetimeTaskDialog({
  isOpen,
  onClose,
  task,
  onRetime,
}: RetimeTaskDialogProps) {
  if (!isOpen || !task) return null;

  const [retimedTo, setRetimedTo] = useState(task.retimed_to || '3. TKO');
  const [newStart, setNewStart] = useState(task.exp_start_date || formatDate(new Date()));
  const [newEnd, setNewEnd] = useState(task.exp_end_date || formatDate(new Date()));
  const [reason, setReason] = useState(task.skip_reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retimedTo) {
      setError('Please select a target PDP Gate destination');
      return;
    }
    if (new Date(newEnd) < new Date(newStart)) {
      setError('New Finish Date cannot be earlier than New Start Date');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onRetime(task, retimedTo, newStart, newEnd, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to retime task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              Retime Task Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Shift deliverable destination to a future PDP Gate for: <strong className="text-slate-800 font-bold">{task.subject}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-medium">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Retimed To (Future PDP Gate) <span className="text-rose-500">*</span>
            </label>
            <select
              value={retimedTo}
              onChange={(e) => setRetimedTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-purple-50/50 text-purple-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {AUTHORITATIVE_GATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">New Start Date</label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">New Finish Date</label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Retiming Reason / Governance Notes</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplier tooling qualification delayed to VL Gate per engineering concurrence."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Retiming'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
