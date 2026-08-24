import React, { useState } from 'react';
import { Task } from '@/types/task.types';
import { X, SkipForward, Loader2, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskSkipDialogProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSubmitSkipRequest: (task: Task, reason: string, comment?: string) => Promise<void>;
}

export function TaskSkipDialog({ isOpen, task, onClose, onSubmitSkipRequest }: TaskSkipDialogProps) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setReason('');
    setComment('');
    setError('');
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for requesting this task to be skipped.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmitSkipRequest(task, reason.trim(), comment.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit skip request.');
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
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                <SkipForward className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Request Task Skip</h3>
                <p className="text-xs text-amber-800 font-medium">
                  Team Member Skip Request Workflow
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
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Read-only Task Info */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Task Name / Subject</div>
                <div className="font-black text-slate-900 line-clamp-1">{task.subject}</div>
                <div className="text-[10px] font-mono text-slate-500">{task.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Current Status</div>
                <div className="font-bold text-slate-800">{task.status || 'Open'}</div>
                <div className="text-[10px] text-slate-500">Project: {task.project}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-800">
                <AlertCircle className="h-4 w-4 text-sky-600 shrink-0" />
                <span>Approval Workflow Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-sky-800">
                Submitting this request will send it to the <strong>Project Manager</strong> for review. The task will <strong>remain active</strong> in its current state until the Project Manager approves the skip request.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Skip Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Customer requirement changed and this activity is no longer required for this vehicle variant..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Additional Comments (Optional)
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Discussed with lead engineer on 24-Aug"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Submit Skip Request
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
