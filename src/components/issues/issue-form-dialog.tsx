import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Issue, IssueStatus, IssuePriority, IssueType } from '@/types/issue.types';
import { Project } from '@/types/project.types';
import { useProjects } from '@/hooks/use-projects';
import { useProjectTeam } from '@/hooks/use-project-team';
import { ProjectTeamMember } from '@/types/team.types';
import { X, Loader2, AlertTriangle, User, Tag, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface IssueFormValues {
  subject: string;
  project?: string;
  status: IssueStatus;
  priority: IssuePriority;
  issue_type: IssueType | string;
  description?: string;
  customer?: string;
  raised_by?: string;
  assigned_to?: string;
}

interface IssueFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: IssueFormValues) => Promise<void>;
  initialData?: Issue | null;
  defaultProjectId?: string;
}

export function IssueFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
}: IssueFormDialogProps) {
  const isEditing = !!initialData;
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormValues>({
    defaultValues: {
      subject: '',
      project: defaultProjectId || '',
      status: 'Open',
      priority: 'Medium',
      issue_type: 'Technical',
      description: '',
      customer: '',
      raised_by: '',
      assigned_to: '',
    },
  });

  const selectedProjectId = watch('project') || defaultProjectId;
  const { data: teamMembers = [] } = useProjectTeam(selectedProjectId);

  useEffect(() => {
    if (initialData) {
      reset({
        subject: initialData.subject || '',
        project: initialData.project || defaultProjectId || '',
        status: initialData.status || 'Open',
        priority: initialData.priority || 'Medium',
        issue_type: initialData.issue_type || 'Technical',
        description: initialData.description || '',
        customer: initialData.customer || '',
        raised_by: initialData.raised_by || '',
        assigned_to: initialData.assigned_to || '',
      });
    } else {
      reset({
        subject: '',
        project: defaultProjectId || (projects.length > 0 ? projects[0].name : ''),
        status: 'Open',
        priority: 'Medium',
        issue_type: 'Technical',
        description: '',
        customer: '',
        raised_by: '',
        assigned_to: '',
      });
    }
  }, [initialData, reset, isOpen, defaultProjectId, projects]);

  const onFormSubmit = async (values: IssueFormValues) => {
    try {
      await onSubmit(values);
      onClose();
    } catch {
      // Keep modal open on API failure
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
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Dialog Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isEditing ? `Edit Issue (${initialData?.name})` : 'Create New Issue'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Log and assign engineering issues, non-conformances, or defect tickets in ERPNext.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Issue Subject / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('subject', { required: 'Subject is required' })}
                placeholder="e.g. Battery pack cooling loop pressure drop during high load test"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
              {errors.subject && (
                <p className="text-[11px] font-bold text-rose-500">{errors.subject.message}</p>
              )}
            </div>

            {/* Project & Issue Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Associated Project
                </label>
                <select
                  {...register('project')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="">No Project Associated</option>
                  {projects.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.project_name || p.name} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Issue Type
                </label>
                <select
                  {...register('issue_type')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="Technical">Technical Issue</option>
                  <option value="Defect">Manufacturing Defect</option>
                  <option value="Quality">Quality Non-Conformance</option>
                  <option value="Safety">Safety & Compliance</option>
                  <option value="General">General Ticket</option>
                </select>
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="Replied">Replied</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Priority Level <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent / Critical</option>
                </select>
              </div>
            </div>

            {/* Assigned To */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Assigned Team Member / Engineer
              </label>
              <select
                {...register('assigned_to')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((tm: ProjectTeamMember) => (
                  <option key={tm.id} value={tm.user_email || tm.employee_name}>
                    {tm.employee_name} ({tm.role} — {tm.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Description & Root Cause Analysis Notes
              </label>
              <textarea
                rows={4}
                {...register('description')}
                placeholder="Detailed technical description, testing conditions, root cause hypothesis, and mitigation steps..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? 'Save Issue Updates' : 'Create ERPNext Issue'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
