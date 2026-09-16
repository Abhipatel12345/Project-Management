'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task.types';
import { X, Sparkles, Calendar } from 'lucide-react';
import { formatDate } from '@/utils/gantt-scheduling-engine';

interface CreateCustomMilestoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSubmit: (milestoneData: Partial<Task>) => Promise<void>;
}

export function CreateCustomMilestoneDialog({
  isOpen,
  onClose,
  projectId,
  onSubmit,
}: CreateCustomMilestoneDialogProps) {
  const todayStr = formatDate(new Date());
  const [subject, setSubject] = useState('');
  const [milestoneDate, setMilestoneDate] = useState(todayStr);
  const [phase, setPhase] = useState('Phase 1: Concept & Planning');
  const [gate, setGate] = useState('1. PL');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Milestone Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        subject: `[Milestone] ${subject.trim()}`,
        project: projectId,
        phase,
        custom_phase: phase,
        gate,
        custom_gate: gate,
        exp_start_date: milestoneDate,
        exp_end_date: milestoneDate,
        duration: 0,
        priority: 'High',
        status: 'Open',
        progress: 0,
        description: description.trim(),
        is_milestone: true,
        custom_is_milestone: 1,
        is_custom: true,
        custom_is_custom: 1,
        is_mandatory_pdp: false,
        custom_is_mandatory_pdp: 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create milestone');
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
              <Sparkles className="h-4 w-4 text-amber-500" />
              Add Custom Project Milestone
            </h3>
            <p className="text-xs text-slate-500">
              Create a critical delivery milestone for {projectId}.
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
              Milestone Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Prototype Tooling Acceptance Sign-off"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Target Milestone Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={milestoneDate}
              onChange={(e) => setMilestoneDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Phase 1: Concept & Planning">Phase 1: Concept & Planning</option>
                <option value="Phase 2: Product Design & Development">Phase 2: Product Design</option>
                <option value="Phase 3: Process Design & Development">Phase 3: Process Design</option>
                <option value="Phase 4: Validation & Launch">Phase 4: Validation & Launch</option>
                <option value="Phase 5: Production & Feedback">Phase 5: Production</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PDP Gate</label>
              <select
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="1. PL">1. PL</option>
                <option value="2. VC">2. VC</option>
                <option value="3. TKO">3. TKO</option>
                <option value="4. VL">4. VL</option>
                <option value="5. CPA">5. CPA</option>
                <option value="6. CT">6. CT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sign-off criteria or milestone deliverables..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? 'Creating...' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
