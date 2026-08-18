import React, { useState } from 'react';
import { Task } from '@/types/task.types';
import { X, SkipForward, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskSkipDialogProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirmSkip: (task: Task, reason: string) => Promise<void>;
}

export function TaskSkipDialog({ isOpen, task, onClose, onConfirmSkip }: TaskSkipDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setIsSubmitting(true);
      await onConfirmSkip(task, reason.trim());
      onClose();
    } catch {
      // keep open on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-purple-50/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
                <SkipForward className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Skip Task Work Package</h3>
                <p className="text-xs text-purple-800 font-medium">
                  {task.name} — {task.subject}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Task Skipping Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Skipping this task will mark its status as <strong>Skipped</strong> and preserve baseline comparisons. Please document the engineering justification or change request.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Skipping Task <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Work package deemed non-applicable for this prototype variant per ECN-2026-44..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Skip Task
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
