'use client';

import React, { useState, useEffect } from 'react';
import { Task, MilestoneType, MILESTONE_TYPES } from '@/types/task.types';
import { Gate } from '@/types/gate.types';
import {
  X,
  Sparkles,
  Calendar,
  Layers,
  Flag,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Upload,
  Link as LinkIcon,
  ShieldCheck,
  Star,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/utils/gantt-scheduling-engine';

interface CreateCustomMilestoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialData?: Task | null;
  existingTasks?: Task[];
  gates?: Gate[];
  onSubmit: (milestoneData: Partial<Task>, files?: File[]) => Promise<void>;
}

export function CreateCustomMilestoneDialog({
  isOpen,
  onClose,
  projectId,
  initialData,
  existingTasks = [],
  gates = [],
  onSubmit,
}: CreateCustomMilestoneDialogProps) {
  const isEditing = Boolean(initialData);
  const todayStr = formatDate(new Date());

  // Clean initial subject if it starts with [Milestone] or [Customer]
  const getCleanSubject = (s?: string) => {
    if (!s) return '';
    return s.replace(/^\[(?:milestone|customer)\]\s*/i, '').trim();
  };

  // Calculate safe default planned date within existing project boundaries
  const getDefaultPlannedDate = () => {
    const relevantTasks = existingTasks.filter(
      (t) => (!t.project || t.project === projectId) && (t.exp_end_date || t.exp_start_date)
    );
    if (relevantTasks.length > 0) {
      const allDates = relevantTasks.flatMap((t) => [t.exp_start_date, t.exp_end_date].filter(Boolean) as string[]);
      allDates.sort();
      const minDate = allDates[0];
      const maxDate = allDates[allDates.length - 1];

      if (todayStr >= minDate && todayStr <= maxDate) {
        return todayStr;
      }
      if (todayStr > maxDate) {
        return maxDate;
      }
      if (todayStr < minDate) {
        return minDate;
      }
    }
    return todayStr;
  };

  const [subject, setSubject] = useState('');
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('Internal Milestone');
  const [isCustomerMilestone, setIsCustomerMilestone] = useState(false);
  const [plannedDate, setPlannedDate] = useState(() => getDefaultPlannedDate());
  const [actualDate, setActualDate] = useState('');
  const [status, setStatus] = useState<'Open' | 'Working' | 'Completed' | 'Cancelled'>('Open');
  const [phase, setPhase] = useState('Phase 1: Concept & Planning');
  const [linkedTask, setLinkedTask] = useState('');
  const [gate, setGate] = useState('1. PL');
  const [isKgd, setIsKgd] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (initialData) {
      const isCust = Boolean(
        initialData.is_customer_milestone ||
        initialData.custom_is_customer_milestone === 1 ||
        initialData.milestone_type === 'Customer Milestone' ||
        initialData.custom_milestone_type === 'Customer Milestone' ||
        initialData.subject?.toLowerCase().includes('[customer]')
      );

      const mType = (initialData.milestone_type as MilestoneType) ||
        (isCust ? 'Customer Milestone' : 'Internal Milestone');

      setSubject(getCleanSubject(initialData.subject));
      setMilestoneType(mType);
      setIsCustomerMilestone(isCust);
      setPlannedDate(initialData.planned_date || initialData.exp_end_date || initialData.exp_start_date || getDefaultPlannedDate());
      setActualDate(initialData.actual_date || initialData.act_end_date || initialData.actual_end_date || '');
      setStatus((initialData.status as any) || 'Open');
      setPhase(initialData.phase || 'Phase 1: Concept & Planning');
      setLinkedTask(initialData.linked_task || initialData.custom_linked_task || '');
      setGate(initialData.linked_gate || initialData.custom_linked_gate || initialData.gate || initialData.custom_gate || '1. PL');
      setIsKgd(Boolean(initialData.is_kgd || initialData.custom_is_kgd === 1));
      setDescription(initialData.description || '');
      setSelectedFiles([]);
      setError(null);
    } else {
      setSubject('');
      setMilestoneType('Internal Milestone');
      setIsCustomerMilestone(false);
      setPlannedDate(getDefaultPlannedDate());
      setActualDate('');
      setStatus('Open');
      setPhase('Phase 1: Concept & Planning');
      setLinkedTask('');
      setGate('1. PL');
      setIsKgd(false);
      setDescription('');
      setSelectedFiles([]);
      setError(null);
    }
  }, [initialData, isOpen, todayStr]);

  if (!isOpen) return null;

  // Filter tasks to only those from the current project and not milestones themselves
  const projectTasks = existingTasks.filter(
    (t) => (!t.project || t.project === projectId) && !t.is_milestone && t.name !== initialData?.name
  );

  // Handler for Milestone Type change
  const handleMilestoneTypeChange = (newType: MilestoneType) => {
    setMilestoneType(newType);
    if (newType === 'Customer Milestone') {
      setIsCustomerMilestone(true);
    }
  };

  // Handler for Customer Milestone checkbox toggle
  const handleCustomerToggle = (checked: boolean) => {
    setIsCustomerMilestone(checked);
    if (checked && milestoneType !== 'Customer Milestone') {
      setMilestoneType('Customer Milestone');
    }
  };

  // Handle Linked Task change and auto-inherit dates/phase/gate
  const handleLinkedTaskChange = (taskId: string) => {
    setLinkedTask(taskId);
    if (taskId) {
      const taskObj = projectTasks.find((t) => t.name === taskId || t.subject === taskId);
      if (taskObj) {
        const d = taskObj.exp_end_date || taskObj.exp_start_date;
        if (d) {
          setPlannedDate(d);
        }
        if (taskObj.phase) {
          setPhase(taskObj.phase);
        }
        if (taskObj.gate) {
          setGate(taskObj.gate);
        }
      }
    }
  };

  // Inherit date from linked task manually
  const handleInheritDate = () => {
    if (!linkedTask) return;
    const taskObj = projectTasks.find((t) => t.name === linkedTask || t.subject === linkedTask);
    if (taskObj) {
      const d = taskObj.exp_end_date || taskObj.exp_start_date;
      if (d) {
        setPlannedDate(d);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Milestone Name is required.');
      return;
    }

    if (!plannedDate) {
      setError('Planned Date is required.');
      return;
    }

    if (!projectId) {
      setError('Target Project is missing.');
      return;
    }

    // Validation: ensure linked task belongs to current project
    if (linkedTask) {
      const valid = projectTasks.some((t) => t.name === linkedTask || t.subject === linkedTask);
      if (!valid) {
        setError(`Linked Task "${linkedTask}" is not part of project ${projectId}. Cross-project links are prohibited.`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    const finalSubject = subject.trim();

    try {
      const milestonePayload: Partial<Task> = {
        name: initialData?.name,
        subject: finalSubject,
        project: projectId,
        phase,
        custom_phase: phase,
        gate,
        custom_gate: gate,
        linked_gate: gate,
        custom_linked_gate: gate,
        exp_start_date: plannedDate,
        exp_end_date: plannedDate,
        planned_date: plannedDate,
        actual_start_date: actualDate || undefined,
        actual_end_date: actualDate || undefined,
        act_start_date: actualDate || undefined,
        act_end_date: actualDate || undefined,
        actual_date: actualDate || undefined,
        duration: 0,
        priority: isCustomerMilestone ? 'Urgent' : 'High',
        status,
        progress: status === 'Completed' ? 100 : status === 'Working' ? 50 : 0,
        description: description.trim(),
        is_milestone: true,
        custom_is_milestone: 1,
        is_customer_milestone: isCustomerMilestone,
        custom_is_customer_milestone: isCustomerMilestone ? 1 : 0,
        milestone_type: milestoneType,
        custom_milestone_type: milestoneType,
        linked_task: linkedTask || undefined,
        custom_linked_task: linkedTask || undefined,
        is_kgd: isKgd,
        custom_is_kgd: isKgd ? 1 : 0,
        is_custom: initialData ? initialData.is_custom : true,
        custom_is_custom: initialData ? initialData.custom_is_custom : 1,
        is_mandatory_pdp: false,
        custom_is_mandatory_pdp: 0,
      };

      await onSubmit(milestonePayload, selectedFiles);
      onClose();
    } catch (err: any) {
      const rawMsg =
        err?.response?.data?._error_message ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save milestone';
      const cleanMsg = typeof rawMsg === 'string'
        ? rawMsg.replace(/<[^>]*>?/gm, '').trim()
        : 'Failed to save milestone';
      setError(cleanMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isCustomerMilestone
                ? 'bg-purple-50 border-purple-200 text-purple-600'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              {isCustomerMilestone ? <Star className="h-5 w-5 fill-purple-600" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {isEditing ? 'Edit Project Milestone' : 'Add Project Milestone'}
                {isCustomerMilestone && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-200">
                    Customer Milestone
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Milestones are zero-duration project events (checkpoints) for <strong>{projectId}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-medium">
          {/* Milestone Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Milestone Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Initial Drawing Release / PSW Signoff / PPAP Approval"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Milestone Classification & Customer Milestone Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Milestone Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={milestoneType}
                onChange={(e) => handleMilestoneTypeChange(e.target.value as MilestoneType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {MILESTONE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-center">
              <label className="text-[11px] font-bold text-slate-700 mb-1">
                Customer Milestone Flag
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={isCustomerMilestone}
                  onChange={(e) => handleCustomerToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className={`text-xs font-black ${isCustomerMilestone ? 'text-purple-700' : 'text-slate-600'}`}>
                  Customer Milestone = {isCustomerMilestone ? 'Yes' : 'No'}
                </span>
              </label>
            </div>
          </div>

          {/* Planned Date vs Actual Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Planned Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Actual Completion Date (Optional)
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Phase & Gate Linking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Project Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
              >
                <option value="Phase 1: Concept & Planning">Phase 1: Concept & Planning</option>
                <option value="Phase 2: Product Design & Development">Phase 2: Product Design</option>
                <option value="Phase 3: Process Design & Development">Phase 3: Process Design</option>
                <option value="Phase 4: Validation & Launch">Phase 4: Validation & Launch</option>
                <option value="Phase 5: Production & Feedback">Phase 5: Production & Feedback</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PDP Gate</label>
              <select
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
              >
                <option value="1. PL">1. PL (Project Launch)</option>
                <option value="2. VC">2. VC (Concept Validation)</option>
                <option value="3. TKO">3. TKO (Tool Kick-Off)</option>
                <option value="4. VL">4. VL (Design Validation)</option>
                <option value="5. CPA">5. CPA (Production Agreement)</option>
                <option value="6. CT">6. CT (Close & Transfer)</option>
              </select>
            </div>
          </div>

          {/* Linked Task & KGD Flag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">Linked Task (Optional)</label>
                {linkedTask && (
                  <button
                    type="button"
                    onClick={handleInheritDate}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-800 transition cursor-pointer"
                  >
                    Sync Date
                  </button>
                )}
              </div>
              <select
                value={linkedTask}
                onChange={(e) => handleLinkedTaskChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs"
              >
                <option value="">-- No Linked Task --</option>
                {projectTasks.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.subject} ({t.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
              >
                <option value="Open">Planned (Open)</option>
                <option value="Working">In Progress (Working)</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* KGD Designation */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <div>
                <span className="text-xs font-bold text-sky-950 block">Key Gate Deliverable (KGD)</span>
                <span className="text-[10px] text-sky-700">Designate this milestone as authoritative KGD for Gate Readiness.</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isKgd}
                onChange={(e) => setIsKgd(e.target.checked)}
                className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Criteria</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sign-off criteria, customer deliverables, or acceptance notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Reference Documents */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-slate-500" />
              Reference Documents / Attachments
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            {selectedFiles.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-1">
                {selectedFiles.length} file(s) selected to upload to ERPNext Document Vault.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-white font-bold transition disabled:opacity-50 shadow-xs cursor-pointer ${
                isCustomerMilestone
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-amber-500 hover:bg-amber-400'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : isCustomerMilestone
                ? 'Create Customer Milestone'
                : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
