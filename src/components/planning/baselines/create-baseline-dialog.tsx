import React, { useState } from 'react';
import { ProjectBaseline } from '@/types/baseline.types';
import { Task } from '@/types/task.types';
import { X, Loader2, BookmarkPlus, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateBaselineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  existingBaselines: ProjectBaseline[];
  currentTasks: Task[];
  projectName?: string;
}

export function CreateBaselineDialog({
  isOpen,
  onClose,
  onSubmit,
  existingBaselines,
  currentTasks,
  projectName,
}: CreateBaselineDialogProps) {
  const nextNumber = existingBaselines.length > 0
    ? Math.max(...existingBaselines.map((b) => b.baseline_number)) + 1
    : 1;

  const defaultName = `Baseline ${nextNumber}`;

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setName(`Baseline ${nextNumber}`);
    setDescription('');
    setError('');
  }, [isOpen, nextNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Baseline name is required.');
      return;
    }

    const isDuplicate = existingBaselines.some(
      (b) => b.baseline_name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (isDuplicate) {
      setError(`A baseline named "${name.trim()}" already exists for this project.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(name.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create baseline schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Dialog Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Create Schedule Baseline
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Freeze project dates for {projectName || 'current project'}.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Baseline Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Baseline Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Baseline 1 or Gate 3 Design Freeze"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                Auto-assigned sequence number: <strong className="text-slate-700">Baseline #{nextNumber}</strong>
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Description & Freeze Context
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about why this baseline is being created (e.g., Gate 2 Approval, Scope Change, Phase 1 Completion)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            {/* Scope Notice & Snapshot Info Box */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Baseline Scope Confirmation</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-amber-800/90">
                Creating a baseline will capture the current project schedule (<strong className="font-black text-amber-950">{currentTasks.length} tasks</strong>) at this exact moment. Future changes to tasks will not affect this historical snapshot.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>Capture & Freeze Baseline</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
