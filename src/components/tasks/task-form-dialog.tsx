import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskFormSchema, TaskFormValues } from '@/lib/validations/task.schema';
import { Task } from '@/types/task.types';
import { Project } from '@/types/project.types';
import { useProjects, useProject } from '@/hooks/use-projects';
import { useProjectTeam, useAvailableEmployees } from '@/hooks/use-project-team';
import { ProjectTeamMember, EmployeeOption } from '@/types/team.types';
import { findMatchingTeamMember } from '@/utils/auto-assignment';
import { validateTaskDatesAgainstProject } from '@/utils/date-utils';
import { X, Loader2, Calendar, User, ShieldCheck, CheckSquare, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  initialData?: Task | null;
  defaultProjectId?: string;
  isLoading?: boolean;
}

export function TaskFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
  isLoading = false,
}: TaskFormDialogProps) {
  const isEditing = !!initialData;

  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects = projectsData?.projects || [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      subject: '',
      project: defaultProjectId || '',
      status: 'Open',
      priority: 'Medium',
      exp_start_date: '',
      exp_end_date: '',
      expected_time: 0,
      progress: 0,
      description: '',
      assigned_to: '',
      parent_task: '',
      depends_on: '',
      rasic_responsible: '',
      rasic_accountable: '',
      rasic_support: '',
      rasic_consulted: '',
      rasic_informed: '',
    },
  });

  const selectedProjectId = watch('project') || defaultProjectId || '';
  const { data: teamMembers = [] } = useProjectTeam(selectedProjectId);
  const { data: availableEmployees = [] } = useAvailableEmployees('');
  const { data: selectedProject } = useProject(selectedProjectId);

  // Combined selectable users: project team members first, then available system employees
  const allSelectableUsers = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; role: string; department: string }>();

    // 1. Team members
    teamMembers.forEach((tm: ProjectTeamMember) => {
      const email = tm.user_email || tm.employee_name;
      map.set(email.toLowerCase(), {
        id: tm.id,
        name: tm.employee_name,
        email: tm.user_email || '',
        role: tm.role,
        department: tm.department,
      });
    });

    // 2. Available employees
    availableEmployees.forEach((emp: EmployeeOption) => {
      const email = emp.email || emp.name;
      const key = (emp.email || emp.name || emp.full_name).toLowerCase();
      if (!map.has(key) && !map.has(emp.full_name.toLowerCase())) {
        map.set(key, {
          id: emp.name,
          name: emp.full_name,
          email: emp.email || emp.name,
          role: emp.designation || 'Team Member',
          department: emp.department || 'Engineering',
        });
      }
    });

    return Array.from(map.values());
  }, [teamMembers, availableEmployees]);

  const firstProjectName = projects[0]?.name || '';
  const initialTaskIdentifier = initialData?.name || initialData?.subject || '';

  const matchOptionValue = React.useCallback(
    (val?: string) => {
      if (!val) return '';
      const lower = val.toLowerCase().trim();
      const matched = allSelectableUsers.find(
        (u) =>
          u.email?.toLowerCase() === lower ||
          u.name?.toLowerCase() === lower ||
          u.id?.toLowerCase() === lower ||
          (lower.includes('yash') && u.email?.toLowerCase().includes('teammember')) ||
          (lower.includes('sarah') && u.email?.toLowerCase().includes('sarah')) ||
          (lower.includes('admin') && (u.email?.toLowerCase().includes('admin') || u.name?.toLowerCase().includes('admin')))
      );
      return matched ? matched.email || matched.name : val;
    },
    [allSelectableUsers]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const cleanStartDate = initialData.exp_start_date
        ? initialData.exp_start_date.split(' ')[0].split('T')[0]
        : '';
      const cleanEndDate = initialData.exp_end_date
        ? initialData.exp_end_date.split(' ')[0].split('T')[0]
        : '';

      reset({
        subject: initialData.subject || '',
        project: initialData.project || defaultProjectId || '',
        status: (initialData.status as any) || 'Open',
        priority: (initialData.priority as any) || 'Medium',
        exp_start_date: cleanStartDate,
        exp_end_date: cleanEndDate,
        expected_time: initialData.expected_time || 0,
        progress: initialData.progress || 0,
        description: initialData.description || '',
        assigned_to: matchOptionValue(initialData.assigned_to),
        parent_task: initialData.parent_task || '',
        depends_on: typeof initialData.depends_on === 'string' ? initialData.depends_on : '',
        rasic_responsible: matchOptionValue(initialData.rasic?.responsible),
        rasic_accountable: matchOptionValue(initialData.rasic?.accountable),
        rasic_support: matchOptionValue(initialData.rasic?.support),
        rasic_consulted: matchOptionValue(initialData.rasic?.consulted),
        rasic_informed: matchOptionValue(initialData.rasic?.informed),
      });
    } else {
      reset({
        subject: '',
        project: defaultProjectId || firstProjectName,
        status: 'Open',
        priority: 'Medium',
        exp_start_date: '',
        exp_end_date: '',
        expected_time: 0,
        progress: 0,
        description: '',
        assigned_to: '',
        parent_task: '',
        depends_on: '',
        rasic_responsible: '',
        rasic_accountable: '',
        rasic_support: '',
        rasic_consulted: '',
        rasic_informed: '',
      });
    }
  }, [isOpen, initialTaskIdentifier, defaultProjectId, firstProjectName, reset, matchOptionValue, initialData]);

  const onFormSubmit = async (values: TaskFormValues) => {
    // Perform date validation against active project bounds before calling ERPNext API
    const activeProject = selectedProject || projects.find((p: Project) => p.name === values.project);

    const validation = validateTaskDatesAgainstProject(
      values.exp_start_date,
      values.exp_end_date,
      activeProject?.expected_start_date,
      activeProject?.expected_end_date,
      activeProject?.project_name || activeProject?.name || values.project
    );

    if (!validation.isValid) {
      if (validation.startDateError) {
        setError('exp_start_date', {
          type: 'manual',
          message: validation.startDateError,
        });
      }
      if (validation.endDateError) {
        setError('exp_end_date', {
          type: 'manual',
          message: validation.endDateError,
        });
      }
      return; // Stop form submission if date validation fails
    }

    try {
      await onSubmit(values);
      onClose();
    } catch {
      // Keep modal open if API save fails so user can adjust form values
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
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EBF5FF]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
                {isEditing ? <Edit3 className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isEditing ? `Edit Task: ${initialData?.name}` : 'Create New Work Package Task'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Define technical deliverable details, assign team members, set milestones & RASIC.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Task Subject */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Task Subject / Title <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('subject')}
                type="text"
                placeholder="e.g. Finalize High-Voltage Battery Thermal Simulation"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
              />
              {errors.subject && (
                <p className="text-[11px] text-rose-500 font-bold">{errors.subject.message}</p>
              )}
            </div>

            {/* Project & Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Associated Project <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('project')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="">Select Project</option>
                  {projects.map((p: Project) => (
                    <option key={p.name} value={p.name}>
                      {p.project_name} ({p.name})
                    </option>
                  ))}
                </select>
                {errors.project && (
                  <p className="text-[11px] text-rose-500 font-bold">{errors.project.message}</p>
                )}
              </div>

              {/* Assigned To (Shows Project Team members + Auto-Assign button) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Assigned Team Member
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const subject = watch('subject');
                      const match = findMatchingTeamMember(
                        subject,
                        '',
                        allSelectableUsers.map((u) => ({
                          id: u.id,
                          employee_name: u.name,
                          user_email: u.email,
                          role: u.role,
                          function_name: 'Lead Engineering',
                          department: u.department,
                          project_id: selectedProjectId,
                          is_board_member: false,
                          status: 'Active' as const,
                        }))
                      );
                      if (match) {
                        const targetVal = match.member.user_email || match.member.employee_name;
                        setValue('assigned_to', targetVal);
                        if (!watch('rasic_responsible')) {
                          setValue('rasic_responsible', targetVal);
                        }
                      }
                    }}
                    className="text-[10px] font-extrabold text-sky-700 hover:text-sky-900 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 transition cursor-pointer"
                    title="Automatically find matching team member based on role/skills"
                  >
                    ⚡ Auto-Assign
                  </button>
                </div>
                <select
                  {...register('assigned_to')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {allSelectableUsers.map((u) => (
                    <option key={u.id} value={u.email || u.name}>
                      {u.name} ({u.role}{u.department ? ` — ${u.department}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Task Status <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="Working">Working / In Progress</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Skipped">Skipped</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Priority Level <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent / Critical</option>
                </select>
              </div>
            </div>

            {/* Start Date, Due Date, Expected Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Start Date</label>
                <input
                  {...register('exp_start_date')}
                  type="date"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                />
                {errors.exp_start_date && (
                  <p className="text-[11px] text-rose-500 font-bold">{errors.exp_start_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Due Date</label>
                <input
                  {...register('exp_end_date')}
                  type="date"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                />
                {errors.exp_end_date && (
                  <p className="text-[11px] text-rose-500 font-bold">{errors.exp_end_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Expected Hours</label>
                <input
                  {...register('expected_time')}
                  type="number"
                  placeholder="e.g. 40"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* Progress % */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Task Completion Progress</label>
                <span className="font-mono font-black text-sky-600">{watch('progress') || 0}%</span>
              </div>
              <input
                {...register('progress')}
                type="range"
                min="0"
                max="100"
                step="5"
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Engineering Description & Scope</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Specify work package breakdown, technical acceptance criteria, or CAD release notes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
              />
            </div>

            {/* RASIC Section */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
              <div className="flex items-center gap-2 text-sky-800 font-black text-xs uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                <span>RASIC Task Responsibility Matrix</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase">R = Responsible</label>
                  <select
                    {...register('rasic_responsible')}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-slate-800 text-[11px] font-bold mt-1 cursor-pointer"
                  >
                    <option value="">Select Member</option>
                    {allSelectableUsers.map((u) => (
                      <option key={u.id} value={u.email || u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase">A = Accountable</label>
                  <select
                    {...register('rasic_accountable')}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-slate-800 text-[11px] font-bold mt-1 cursor-pointer"
                  >
                    <option value="">Select Member</option>
                    {allSelectableUsers.map((u) => (
                      <option key={u.id} value={u.email || u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase">S = Support</label>
                  <select
                    {...register('rasic_support')}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-slate-800 text-[11px] font-bold mt-1 cursor-pointer"
                  >
                    <option value="">Select Member</option>
                    {allSelectableUsers.map((u) => (
                      <option key={u.id} value={u.email || u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase">C = Consulted</label>
                  <select
                    {...register('rasic_consulted')}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-slate-800 text-[11px] font-bold mt-1 cursor-pointer"
                  >
                    <option value="">Select Member</option>
                    {allSelectableUsers.map((u) => (
                      <option key={u.id} value={u.email || u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase">I = Informed</label>
                  <select
                    {...register('rasic_informed')}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-sky-200 text-slate-800 text-[11px] font-bold mt-1 cursor-pointer"
                  >
                    <option value="">Select Member</option>
                    {allSelectableUsers.map((u) => (
                      <option key={u.id} value={u.email || u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Triggers */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditing ? 'Save Task Updates' : 'Create Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
