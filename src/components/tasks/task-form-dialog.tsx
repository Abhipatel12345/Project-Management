import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskFormSchema, TaskFormValues } from '@/lib/validations/task.schema';
import { Task, TaskAttachment } from '@/types/task.types';
import { Project } from '@/types/project.types';
import { useProjects, useProject } from '@/hooks/use-projects';
import { useProjectTeam, useAvailableEmployees } from '@/hooks/use-project-team';
import { ProjectTeamMember, EmployeeOption } from '@/types/team.types';
import { findMatchingTeamMember } from '@/utils/auto-assignment';
import { validateTaskDatesAgainstProject } from '@/utils/date-utils';
import { getProjectPhases, formatPhaseName, inferTaskPhase, STANDARD_PROJECT_PHASES, ProjectPhase } from '@/constants/phases';
import { useProjectPhases } from '@/hooks/use-project-phases';
import { CreatePhaseDialog } from './create-phase-dialog';
import { taskService } from '@/services/task.service';
import { X, Loader2, Calendar, User, ShieldCheck, CheckSquare, Edit3, Layers, Paperclip, Upload, FileText, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues, attachments?: File[], removedAttachmentIds?: string[]) => Promise<void>;
  initialData?: Task | null;
  defaultProjectId?: string;
  defaultPhase?: string;
  isLoading?: boolean;
}

export function TaskFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
  defaultPhase,
  isLoading = false,
}: TaskFormDialogProps) {
  const isEditing = !!initialData;
  const [isCreatePhaseOpen, setIsCreatePhaseOpen] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = React.useState<TaskAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = React.useState<string[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      phase: defaultPhase || 'Phase 1: Concept & Planning',
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
  const { data: projectPhases = STANDARD_PROJECT_PHASES } = useProjectPhases(selectedProjectId);
  const availablePhases = useMemo(() => {
    const rawList = (!selectedProjectId ? STANDARD_PROJECT_PHASES : projectPhases) || STANDARD_PROJECT_PHASES;
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const uniqueList: ProjectPhase[] = [];

    rawList.forEach((p, idx) => {
      const pName = (p.name || '').trim();
      if (!pName) return;

      const normName = pName.toLowerCase();
      if (seenNames.has(normName)) return;
      seenNames.add(normName);

      let cleanId = (p.id || '').trim();
      if (!cleanId || seenIds.has(cleanId)) {
        cleanId = `phase-${p.phase_number || idx + 1}-${encodeURIComponent(pName)}`;
      }
      seenIds.add(cleanId);

      uniqueList.push({
        ...p,
        id: cleanId,
        name: pName,
      });
    });

    return uniqueList.length > 0 ? uniqueList : STANDARD_PROJECT_PHASES;
  }, [selectedProjectId, projectPhases]);
  const currentPhase = watch('phase') || defaultPhase || 'Phase 1: Concept & Planning';

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

      const taskPhase = initialData.phase
        ? formatPhaseName(initialData.phase)
        : inferTaskPhase(initialData);

      reset({
        subject: initialData.subject || '',
        project: initialData.project || defaultProjectId || '',
        phase: taskPhase,
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
        phase: defaultPhase || 'Phase 1: Concept & Planning',
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

    // Reset attachments state
    setSelectedFiles([]);
    setRemovedAttachmentIds([]);
    setFileError(null);

    if (initialData?.name) {
      setIsLoadingAttachments(true);
      taskService
        .getTaskAttachments(initialData.name)
        .then((atts) => setExistingAttachments(atts || []))
        .catch(() => setExistingAttachments([]))
        .finally(() => setIsLoadingAttachments(false));
    } else {
      setExistingAttachments([]);
    }
  }, [isOpen, initialTaskIdentifier, defaultProjectId, defaultPhase, firstProjectName, reset, matchOptionValue, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFileError(null);

    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
    const validFiles: File[] = [];

    for (const f of newFiles) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!allowed.includes(ext)) {
        setFileError(`File "${f.name}" has unsupported format. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG.`);
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        setFileError(`File "${f.name}" exceeds maximum allowed size of 25MB.`);
        continue;
      }
      if (!selectedFiles.some((existing) => existing.name === f.name)) {
        validFiles.push(f);
      }
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingAttachment = (attIdOrName: string) => {
    setRemovedAttachmentIds((prev) => [...prev, attIdOrName]);
    setExistingAttachments((prev) =>
      prev.filter((a) => a.name !== attIdOrName && a.file_name !== attIdOrName)
    );
  };

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
      await onSubmit(values, selectedFiles, removedAttachmentIds);
      onClose();
    } catch {
      // Keep modal open if API save fails so user can adjust form values
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div key="task-form-dialog-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          key="task-form-dialog-modal-card"
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
                  Define technical deliverable details, assign project phase, team members & RASIC.
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

            {/* Project & Project Phase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Associated Project <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('project')}
                  onChange={(e) => {
                    const newProj = e.target.value;
                    setValue('project', newProj, { shouldValidate: true });
                    // Clear currently selected phase on project change to fetch project-specific phases
                    setValue('phase', '', { shouldValidate: false });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option key="project-opt-placeholder" value="">Select Project</option>
                  {projects.map((p: Project) => (
                    <option key={`project-opt-${p.name}`} value={p.name}>
                      {p.project_name} ({p.name})
                    </option>
                  ))}
                </select>
                {errors.project && (
                  <p className="text-[11px] text-rose-500 font-bold">{errors.project.message}</p>
                )}
              </div>

              {/* Project Phase */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Project Phase <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-medium">APQP Stage</span>
                </label>
                <select
                  value={currentPhase || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__CREATE_NEW_PHASE__') {
                      if (!selectedProjectId) {
                        setError('project', {
                          message: 'Please select an Associated Project first before creating a phase.',
                        });
                        return;
                      }
                      setIsCreatePhaseOpen(true);
                    } else {
                      setValue('phase', val, { shouldValidate: true });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  {!currentPhase && (
                    <option key="phase-opt-placeholder" value="">
                      Select Project Phase
                    </option>
                  )}
                  {availablePhases.map((phase) => (
                    <option key={`phase-opt-${phase.id}`} value={phase.name}>
                      {phase.name}
                    </option>
                  ))}
                  <option key="phase-separator-divider" disabled value="">
                    ────────────────────────
                  </option>
                  <option key="create-phase-action" value="__CREATE_NEW_PHASE__" className="font-extrabold text-sky-600">
                    + Create Phase
                  </option>
                </select>
                {errors.phase && (
                  <p className="text-[11px] text-rose-500 font-bold">{errors.phase.message}</p>
                )}
              </div>
            </div>

            {/* Assigned To */}
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
                <option key="assignee-opt-unassigned" value="">Unassigned</option>
                {allSelectableUsers.map((u, idx) => (
                  <option key={`assignee-opt-${u.id || u.email || u.name || idx}`} value={u.email || u.name}>
                    {u.name} ({u.role}{u.department ? ` — ${u.department}` : ''})
                  </option>
                ))}
              </select>
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
                  <option key="status-opt-open" value="Open">Open</option>
                  <option key="status-opt-working" value="Working">Working / In Progress</option>
                  <option key="status-opt-pending-review" value="Pending Review">Pending Review</option>
                  <option key="status-opt-completed" value="Completed">Completed</option>
                  <option key="status-opt-skipped" value="Skipped">Skipped</option>
                  <option key="status-opt-cancelled" value="Cancelled">Cancelled</option>
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
                  <option key="priority-opt-low" value="Low">Low</option>
                  <option key="priority-opt-medium" value="Medium">Medium</option>
                  <option key="priority-opt-high" value="High">High</option>
                  <option key="priority-opt-urgent" value="Urgent">Urgent / Critical</option>
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
                    <option key="rasic-r-placeholder" value="">Select Member</option>
                    {allSelectableUsers.map((u, idx) => (
                      <option key={`rasic-r-user-${u.id || u.email || u.name || idx}`} value={u.email || u.name}>
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
                    <option key="rasic-a-placeholder" value="">Select Member</option>
                    {allSelectableUsers.map((u, idx) => (
                      <option key={`rasic-a-user-${u.id || u.email || u.name || idx}`} value={u.email || u.name}>
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
                    <option key="rasic-s-placeholder" value="">Select Member</option>
                    {allSelectableUsers.map((u, idx) => (
                      <option key={`rasic-s-user-${u.id || u.email || u.name || idx}`} value={u.email || u.name}>
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
                    <option key="rasic-c-placeholder" value="">Select Member</option>
                    {allSelectableUsers.map((u, idx) => (
                      <option key={`rasic-c-user-${u.id || u.email || u.name || idx}`} value={u.email || u.name}>
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
                    <option key="rasic-i-placeholder" value="">Select Member</option>
                    {allSelectableUsers.map((u, idx) => (
                      <option key={`rasic-i-user-${u.id || u.email || u.name || idx}`} value={u.email || u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Attachments / Reference Documents Section */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-black text-xs uppercase tracking-wider">
                  <Paperclip className="h-4 w-4 text-sky-600" />
                  <span>Attachments / Reference Documents</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-sky-700 hover:bg-sky-50 border border-sky-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Documents</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Attach reference engineering drawings, customer specifications, or validation reports directly to this task. Supported formats: PDF, DOCX, XLSX, PPTX, JPG, PNG (Max 25MB each).
              </p>

              {fileError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Existing Attachments (when editing) */}
              {isEditing && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase">
                    Existing Task Documents ({existingAttachments.length})
                  </label>
                  {isLoadingAttachments ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading attachments...</span>
                    </div>
                  ) : existingAttachments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No previous documents attached.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {existingAttachments.map((att) => (
                        <div
                          key={att.name || att.file_name}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{att.file_name}</span>
                            {att.file_size ? (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({(att.file_size / 1024).toFixed(0)} KB)
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingAttachment(att.name || att.file_name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove attachment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Files (Before submitting) */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-extrabold text-sky-700 uppercase">
                    Selected Files To Upload ({selectedFiles.length}):
                  </label>
                  <div className="space-y-1.5">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-sky-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                          <span className="font-bold text-slate-900 truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[11px] transition cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Create Custom Phase Modal */}
      {isCreatePhaseOpen && (
        <CreatePhaseDialog
          key="task-form-create-phase-dialog"
          isOpen={isCreatePhaseOpen}
          onClose={() => setIsCreatePhaseOpen(false)}
          projectId={selectedProjectId}
          projectName={selectedProject?.project_name || selectedProjectId}
          onPhaseCreated={(newPhaseName) => {
            setValue('phase', newPhaseName, { shouldValidate: true });
          }}
        />
      )}
    </>
  );
}
