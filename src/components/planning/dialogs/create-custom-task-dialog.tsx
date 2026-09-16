'use client';

import React, { useState } from 'react';
import { ProjectTeamMember } from '@/types/team.types';
import { Task, TaskPriority } from '@/types/task.types';
import { BOARD_FUNCTIONS, PDT_ROLES } from '@/config/charter-choices.config';
import { X, Plus, Calendar, User, Layers, Lock } from 'lucide-react';
import { formatDate } from '@/utils/gantt-scheduling-engine';

interface CreateCustomTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  teamMembers: ProjectTeamMember[];
  onSubmit: (taskData: Partial<Task>) => Promise<void>;
}

export function CreateCustomTaskDialog({
  isOpen,
  onClose,
  projectId,
  teamMembers,
  onSubmit,
}: CreateCustomTaskDialogProps) {
  const todayStr = formatDate(new Date());
  const [subject, setSubject] = useState('');
  const [phase, setPhase] = useState('Phase 1: Concept & Planning');
  const [gate, setGate] = useState('1. PL');
  const [startDate, setStartDate] = useState(todayStr);
  const [finishDate, setFinishDate] = useState(todayStr);
  const [functionName, setFunctionName] = useState('PE');
  const [role, setRole] = useState('Lead Product Engineer');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Task Name is required');
      return;
    }
    if (new Date(finishDate) < new Date(startDate)) {
      setError('Finish Date cannot be earlier than Start Date');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(finishDate).getTime();
      const duration = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);

      await onSubmit({
        subject: subject.trim(),
        project: projectId,
        phase,
        custom_phase: phase,
        gate,
        custom_gate: gate,
        exp_start_date: startDate,
        exp_end_date: finishDate,
        duration,
        function_name: functionName,
        custom_function: functionName,
        role,
        custom_role: role,
        assigned_to: assignedTo || undefined,
        priority,
        status: 'Open',
        progress: 0,
        description: description.trim(),
        is_custom: true,
        custom_is_custom: 1,
        is_mandatory_pdp: false,
        custom_is_mandatory_pdp: 0,
        is_milestone: false,
        custom_is_milestone: 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create custom task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="h-4 w-4 text-sky-600" />
              Add Custom Project Task
            </h3>
            <p className="text-xs text-slate-500">
              Create an ad-hoc or project-specific task outside standard PDP tasks for {projectId}.
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
              Task Name / Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Supplementary Prototype Harness Verification"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Finish Date</label>
              <input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Function</label>
              <select
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {BOARD_FUNCTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PDT Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {PDT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Owner / Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map((m) => (
                  <option key={m.id || m.user_email} value={m.user_email}>
                    {m.employee_name || m.user_email} ({m.function_name || m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details and deliverables notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Custom Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
