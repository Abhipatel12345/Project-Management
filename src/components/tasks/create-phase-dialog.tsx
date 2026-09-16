'use client';

import React, { useState } from 'react';
import { useCreateProjectPhase } from '@/hooks/use-project-phases';
import { useToast } from '@/providers/toast-context';
import { Layers, X, Loader2, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreatePhaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  onPhaseCreated?: (newPhaseName: string) => void;
}

export function CreatePhaseDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  onPhaseCreated,
}: CreatePhaseDialogProps) {
  const { showToast } = useToast();
  const [phaseName, setPhaseName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createPhaseMutation = useCreateProjectPhase();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = phaseName.trim();
    if (!trimmedName) {
      setError('Please enter a valid phase name');
      return;
    }

    if (!projectId) {
      setError('Please select an associated project before creating a phase.');
      return;
    }

    try {
      const created = await createPhaseMutation.mutateAsync({
        projectId,
        phaseName: trimmedName,
        description: description.trim() || undefined,
      });

      showToast(`Phase "${created.name}" created successfully!`, 'success');
      setPhaseName('');
      setDescription('');
      if (onPhaseCreated) {
        onPhaseCreated(created.name);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to create phase';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  return (
    <div key="create-phase-dialog-overlay" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <motion.div
        key="create-phase-dialog-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EBF5FF]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Create New Project Phase</h3>
              <p className="text-xs text-slate-500 font-medium">
                Add a custom milestone stage to {projectName || projectId || 'this project'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Target Project Badge */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">Target Project:</span>
            <span className="font-extrabold text-sky-700">{projectName || projectId || 'Global Project'}</span>
          </div>

          {/* Phase Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Phase Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={phaseName}
              onChange={(e) => {
                setPhaseName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Phase 6: Warranty & Field Quality Ramp"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
            />
            <p className="text-[10px] text-slate-400 font-medium">
              Example: &ldquo;Phase 6: Warranty Analysis&rdquo; or &ldquo;Pre-Series Tooling Trials&rdquo;
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Phase Scope & Objectives <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe key deliverables and milestones for this phase..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPhaseMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {createPhaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Phase</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
