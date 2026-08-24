import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  DesignReview,
  DesignReviewType,
  DesignReviewStatus,
  DesignReviewApprovalStatus,
} from '@/types/design-review.types';
import { Project } from '@/types/project.types';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/providers/auth-context';
import { X, Loader2, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DesignReviewFormValues {
  title: string;
  project?: string;
  review_type: DesignReviewType | string;
  reviewer: string;
  review_date?: string;
  participantsStr?: string;
  status: DesignReviewStatus;
  approval_status: DesignReviewApprovalStatus;
  description?: string;
  notes?: string;
}

interface DesignReviewFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DesignReviewFormValues) => Promise<void>;
  initialData?: DesignReview | null;
  defaultProjectId?: string;
}

export function DesignReviewFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
}: DesignReviewFormDialogProps) {
  const { hasPermission } = useAuth();
  const canApproveDesign = hasPermission('approveDesign');
  const isEditing = !!initialData;
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DesignReviewFormValues>({
    defaultValues: {
      title: '',
      project: defaultProjectId || '',
      review_type: 'Concept Review',
      reviewer: 'Administrator',
      review_date: new Date().toISOString().split('T')[0],
      participantsStr: 'Administrator, Design Lead',
      status: 'Planned',
      approval_status: 'Pending',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        project: initialData.project || defaultProjectId || '',
        review_type: initialData.review_type || 'Concept Review',
        reviewer: initialData.reviewer || 'Administrator',
        review_date: initialData.review_date || new Date().toISOString().split('T')[0],
        participantsStr: (initialData.participants || []).join(', '),
        status: initialData.status || 'Planned',
        approval_status: initialData.approval_status || 'Pending',
        description: initialData.description || '',
        notes: initialData.notes || '',
      });
    } else {
      reset({
        title: '',
        project: defaultProjectId || (projects.length > 0 ? projects[0].name : ''),
        review_type: 'Concept Review',
        reviewer: 'Administrator',
        review_date: new Date().toISOString().split('T')[0],
        participantsStr: 'Administrator, Quality Lead',
        status: 'Planned',
        approval_status: 'Pending',
        description: '',
        notes: '',
      });
    }
  }, [initialData, reset, isOpen, defaultProjectId, projects]);

  const onFormSubmit = async (values: DesignReviewFormValues) => {
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
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isEditing ? `Edit Design Review (${initialData?.name})` : 'Schedule New Engineering Design Review'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Track APQP milestone reviews, technical peer sign-offs, and design findings in ERPNext.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Review Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('title', { required: 'Review title is required' })}
                placeholder="e.g. EV Battery Pack Thermal Manifold Detailed Design Review"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              {errors.title && <p className="text-[11px] font-bold text-rose-500">{errors.title.message}</p>}
            </div>

            {/* Project & Review Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Associated Project</label>
                <select
                  {...register('project')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                <label className="block text-xs font-bold text-slate-700">Review Type</label>
                <select
                  {...register('review_type')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Concept Review">Concept Review</option>
                  <option value="Preliminary Design Review">Preliminary Design Review (PDR)</option>
                  <option value="Detailed Design Review">Detailed Design Review (DDR)</option>
                  <option value="Engineering Review">Engineering Sign-off</option>
                  <option value="Design Validation Review">Design Validation Review (DVR)</option>
                  <option value="Final Design Review">Final Design Review (FDR)</option>
                </select>
              </div>
            </div>

            {/* Owner, Date & Participants */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Lead / Owner</label>
                <input
                  type="text"
                  {...register('reviewer')}
                  placeholder="e.g. Chief Systems Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Date</label>
                <input
                  type="date"
                  {...register('review_date')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Approval Status & Participants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Approval Sign-off Status</label>
                <select
                  {...register('approval_status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Pending">Pending Sign-off</option>
                  <option value="Under Review">Under Review</option>
                  {canApproveDesign && (
                    <>
                      <option value="Approved">Approved</option>
                      <option value="Approved with Conditions">Approved with Conditions</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  )}
                </select>
                {!canApproveDesign && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    Formal Approval is restricted to Quality / Gate Reviewers and PMO Admins.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Key Participants (Comma separated)</label>
                <input
                  type="text"
                  {...register('participantsStr')}
                  placeholder="e.g. Administrator, Quality Lead, Ergonomics Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Description & Review Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Review Agenda & Technical Scope</label>
              <textarea
                rows={3}
                {...register('description')}
                placeholder="Key design criteria evaluated, CAD boundary conditions, simulation results..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? 'Save Review Updates' : 'Create Design Review'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
