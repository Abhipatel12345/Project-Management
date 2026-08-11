import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Gate, GateType, GateStatus, GateApprovalStatus } from '@/types/gate.types';
import { Project } from '@/types/project.types';
import { useProjects } from '@/hooks/use-projects';
import { X, Loader2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GateFormValues {
  gate_name: string;
  project?: string;
  gate_type: GateType | string;
  planned_date?: string;
  actual_date?: string;
  gate_owner: string;
  status: GateStatus;
  approval_status: GateApprovalStatus;
  description?: string;
}

interface GateFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: GateFormValues) => Promise<void>;
  initialData?: Gate | null;
  defaultProjectId?: string;
}

export function GateFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
}: GateFormDialogProps) {
  const isEditing = !!initialData;
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GateFormValues>({
    defaultValues: {
      gate_name: '',
      project: defaultProjectId || '',
      gate_type: 'Concept & Charter',
      planned_date: new Date().toISOString().split('T')[0],
      actual_date: '',
      gate_owner: 'Program Director',
      status: 'Not Started',
      approval_status: 'Pending',
      description: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        gate_name: initialData.gate_name || '',
        project: initialData.project || defaultProjectId || '',
        gate_type: initialData.gate_type || 'Concept & Charter',
        planned_date: initialData.planned_date || new Date().toISOString().split('T')[0],
        actual_date: initialData.actual_date || '',
        gate_owner: initialData.gate_owner || 'Program Director',
        status: initialData.status || 'Not Started',
        approval_status: initialData.approval_status || 'Pending',
        description: initialData.description || '',
      });
    } else {
      reset({
        gate_name: '',
        project: defaultProjectId || (projects.length > 0 ? projects[0].name : ''),
        gate_type: 'Concept & Charter',
        planned_date: new Date().toISOString().split('T')[0],
        actual_date: '',
        gate_owner: 'Program Director',
        status: 'Not Started',
        approval_status: 'Pending',
        description: '',
      });
    }
  }, [initialData, reset, isOpen, defaultProjectId, projects]);

  const onFormSubmit = async (values: GateFormValues) => {
    try {
      await onSubmit(values);
      onClose();
    } catch {
      // Keep modal open on error
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8"
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isEditing ? `Edit Stage-Gate (${initialData?.name})` : 'Create New APQP Stage-Gate'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Set up product lifecycle gates, sign-off criteria, and deliverable checklists in ERPNext.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Gate Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Gate Name & Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('gate_name', { required: 'Gate name is required' })}
                placeholder="e.g. Gate 2: APQP Stage-Gate & Design Freeze Sign-off"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              {errors.gate_name && <p className="text-[11px] font-bold text-rose-500">{errors.gate_name.message}</p>}
            </div>

            {/* Project & Gate Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Associated Project</label>
                <select
                  {...register('project')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">No Specific Project</option>
                  {projects.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.project_name || p.name} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Gate Type / Phase</label>
                <select
                  {...register('gate_type')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Concept & Charter">Concept & Charter</option>
                  <option value="APQP Stage-Gate">APQP Stage-Gate</option>
                  <option value="Design Freeze">Design Freeze</option>
                  <option value="FMEA & Risk Validation">FMEA & Risk Validation</option>
                  <option value="Validation">Validation & Prototyping</option>
                  <option value="Production Readiness">Production Readiness</option>
                  <option value="Flawless Launch">Flawless Launch</option>
                  <option value="Final Approval">Final Executive Approval</option>
                </select>
              </div>
            </div>

            {/* Owner & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Gate Owner / Lead</label>
                <input
                  type="text"
                  {...register('gate_owner')}
                  placeholder="e.g. Program Director"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Planned Gate Date</label>
                <input
                  type="date"
                  {...register('planned_date')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Actual Completion Date</label>
                <input
                  type="date"
                  {...register('actual_date')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
                />
              </div>
            </div>

            {/* Status & Approval Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Gate Execution Status</label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Ready for Review">Ready for Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Governance Sign-off Decision</label>
                <select
                  {...register('approval_status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Approved with Conditions">Approved with Conditions</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Gate Description & Exit Criteria</label>
              <textarea
                rows={3}
                {...register('description')}
                placeholder="High-level exit criteria, mandatory deliverables required before phase progression..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? 'Save Gate Changes' : 'Create Stage-Gate'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
