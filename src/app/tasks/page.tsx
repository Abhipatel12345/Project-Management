'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useIssues, useCreateIssue, useUpdateIssue, useDeleteIssue } from '@/hooks/use-issues';
import { Task, MemberWorkload, TaskStatus } from '@/types/task.types';
import { Issue, IssueStatus, IssuePriority } from '@/types/issue.types';
import { Project } from '@/types/project.types';
import { TaskSummaryCards } from '@/components/tasks/task-summary-cards';
import { TaskTable } from '@/components/tasks/task-table';
import { TaskKanban } from '@/components/tasks/task-kanban';
import { TaskWorkloadTable } from '@/components/tasks/task-workload-table';
import { TaskWorkloadChart } from '@/components/tasks/task-workload-chart';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TaskSkipApprovalsView } from '@/components/tasks/task-skip-approvals-view';
import { useSkipRequests } from '@/hooks/use-skip-requests';
import { IssueFormDialog, IssueFormValues } from '@/components/issues/issue-form-dialog';
import { IssueDetailModal } from '@/components/issues/issue-detail-modal';
import { TaskFormValues } from '@/lib/validations/task.schema';
import { BackButton } from '@/components/shared/back-button';
import { Pagination } from '@/components/shared/pagination';
import { ImportExportControls } from '@/components/shared/import-export-controls';
import { useAuth } from '@/providers/auth-context';
import { useToast } from '@/providers/toast-context';
import documentService from '@/services/document.service';
import { auditService } from '@/services/audit.service';
import {
  Search,
  Plus,
  Filter,
  List,
  Kanban,
  RefreshCw,
  Layers,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Send,
  FileCheck,
  RotateCcw,
  Clock,
  User,
  FolderKanban,
  MessageSquare,
  ShieldAlert,
  X,
  SkipForward,
  UploadCloud,
  Paperclip,
  FileText,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalTaskManagementPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams ? searchParams.get('tab') : null;

  // Main Tabs: 'tasks' | 'submission' | 'issues' | 'skip-requests'
  const [mainTab, setMainTab] = useState<'tasks' | 'submission' | 'issues' | 'skip-requests'>(
    initialTabParam === 'issues'
      ? 'issues'
      : initialTabParam === 'submission'
      ? 'submission'
      : initialTabParam === 'skip-requests'
      ? 'skip-requests'
      : 'tasks'
  );

  const { data: skipRequests = [] } = useSkipRequests();
  const pendingSkipCount = skipRequests.filter((r: any) => r.status === 'PENDING').length;

  useEffect(() => {
    if (initialTabParam === 'issues') setMainTab('issues');
    else if (initialTabParam === 'submission') setMainTab('submission');
  }, [initialTabParam]);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog & Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Submission State
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [submissionComment, setSubmissionComment] = useState('');
  const [submissionProgress, setSubmissionProgress] = useState(100);
  const [submissionFiles, setSubmissionFiles] = useState<
    { name: string; size: number; file: File; dataUrl: string }[]
  >([]);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Review State
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  // Issue Dialog & Modal State
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null);
  const [issueFilterTask, setIssueFilterTask] = useState<string>('');

  // Data Fetching
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects = projectsData?.projects || [];

  const { data, isLoading, isError, refetch } = useTasks({
    project: selectedProject,
    search: searchQuery,
    status: selectedStatus,
    priority: selectedPriority,
    assigned_to: selectedAssignee,
    is_overdue: showOverdueOnly,
    page,
    pageSize,
  });

  const tasks = data?.tasks || [];
  const summary = data?.summary || {
    totalTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    unassignedTasks: 0,
    avgCompletionRate: 0,
  };

  // Fetch Real ERPNext Issues
  const {
    data: issueListData,
    isLoading: isLoadingIssues,
    refetch: refetchIssues,
  } = useIssues({
    project: selectedProject === 'ALL' ? undefined : selectedProject,
    pageSize: 100,
  });

  const issues: Issue[] = issueListData?.issues || [];

  // Map Task Issue Counts
  const taskIssueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((iss) => {
      const tId = iss.task || (iss.description?.match(/\[Task:\s*([^\]]+)\]/)?.[1]);
      if (tId) {
        counts[tId] = (counts[tId] || 0) + 1;
      }
    });
    return counts;
  }, [issues]);

  // Task Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Issue Mutations
  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue();
  const deleteIssueMutation = useDeleteIssue();

  // Compute Member Workload dynamically
  const memberWorkloads = useMemo(() => {
    const map = new Map<string, MemberWorkload>();
    tasks.forEach((t: Task) => {
      const name = t.assigned_employee_name || t.assigned_to || 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          employee_name: name,
          user_email: t.assigned_to && t.assigned_to.includes('@') ? t.assigned_to : '',
          department: t.department || 'Engineering',
          role: t.assigned_role || 'Team Member',
          totalAssigned: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          completionRate: 0,
          tasks: [],
        });
      }
      const mw = map.get(name)!;
      mw.totalAssigned += 1;
      mw.tasks.push(t);
      if (t.status === 'Completed') mw.completed += 1;
      else if (t.status === 'Working' || t.status === 'In Progress' || t.status === 'Submitted') mw.inProgress += 1;
      else mw.open += 1;
      if (t.is_overdue) mw.overdue += 1;
      mw.completionRate = Math.round((mw.completed / mw.totalAssigned) * 100);
    });
    return Array.from(map.values());
  }, [tasks]);

  // Tasks Ready for Submission (Assignee View)
  const readyForSubmissionTasks = useMemo(() => {
    return tasks.filter(
      (t: Task) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Skipped'
    );
  }, [tasks]);

  // Tasks Submitted for Review (Reviewer View)
  const pendingReviewTasks = useMemo(() => {
    return tasks.filter(
      (t: Task) => t.status === 'Submitted' || t.status === 'Under Review' || t.status === 'Pending Review'
    );
  }, [tasks]);

  // Handlers
  const handleCreateSubmit = async (values: TaskFormValues) => {
    try {
      await createTaskMutation.mutateAsync({
        subject: values.subject,
        project: values.project,
        status: values.status,
        priority: values.priority,
        exp_start_date: values.exp_start_date,
        exp_end_date: values.exp_end_date,
        expected_time: values.expected_time,
        progress: values.progress,
        description: values.description,
        assigned_to: values.assigned_to,
        parent_task: values.parent_task,
        depends_on: values.depends_on,
        rasic: {
          responsible: values.rasic_responsible,
          accountable: values.rasic_accountable,
          support: values.rasic_support,
          consulted: values.rasic_consulted,
          informed: values.rasic_informed,
        },
      });
      showToast('Task created successfully in ERPNext!', 'success');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task in ERPNext', 'error');
    }
  };

  const handleEditSubmit = async (values: TaskFormValues) => {
    if (!editingTask) return;
    try {
      await updateTaskMutation.mutateAsync({
        name: editingTask.name,
        data: {
          subject: values.subject,
          project: values.project,
          status: values.status,
          priority: values.priority,
          exp_start_date: values.exp_start_date,
          exp_end_date: values.exp_end_date,
          expected_time: values.expected_time,
          progress: values.progress,
          description: values.description,
          assigned_to: values.assigned_to,
          parent_task: values.parent_task,
          depends_on: values.depends_on,
          rasic: {
            responsible: values.rasic_responsible,
            accountable: values.rasic_accountable,
            support: values.rasic_support,
            consulted: values.rasic_consulted,
            informed: values.rasic_informed,
          },
        },
      });
      showToast(`Task ${editingTask.name} updated in ERPNext!`, 'success');
      setEditingTask(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    try {
      await deleteTaskMutation.mutateAsync(deletingTask.name);
      showToast(`Task ${deletingTask.name} deleted from ERPNext!`, 'success');
      setDeletingTask(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  // Task Submission Handler
  const handleTaskSubmissionSubmit = async () => {
    if (!submittingTask) return;
    try {
      setIsSubmittingAction(true);
      const submitUser = user?.email || user?.fullName || 'Assignee';
      const updatedDescription = `[Submitted by ${submitUser} on ${new Date().toLocaleDateString()}] ${
        submissionComment ? `Comment: ${submissionComment}` : ''
      }\n${submittingTask.description || ''}`;

      await updateTaskMutation.mutateAsync({
        name: submittingTask.name,
        data: {
          status: 'Submitted',
          progress: submissionProgress,
          description: updatedDescription,
        },
      });
      showToast(`Work package ${submittingTask.name} submitted for review!`, 'success');
      setSubmittingTask(null);
      setSubmissionComment('');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit task', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Task Review Handlers (Approve / Request Changes)
  const handleReviewAction = async (action: 'approve' | 'request_changes') => {
    if (!reviewingTask) return;
    try {
      setIsSubmittingAction(true);
      const reviewer = user?.fullName || user?.email || 'Reviewer';
      const timestamp = new Date().toLocaleDateString();

      if (action === 'approve') {
        const updatedDesc = `[Approved by ${reviewer} on ${timestamp}] ${
          reviewComment ? `Note: ${reviewComment}` : ''
        }\n${reviewingTask.description || ''}`;

        await updateTaskMutation.mutateAsync({
          name: reviewingTask.name,
          data: {
            status: 'Completed',
            progress: 100,
            description: updatedDesc,
          },
        });
        showToast(`Task ${reviewingTask.name} approved & completed!`, 'success');
      } else {
        const updatedDesc = `[Changes Requested by ${reviewer} on ${timestamp}] ${
          reviewComment ? `Feedback: ${reviewComment}` : ''
        }\n${reviewingTask.description || ''}`;

        await updateTaskMutation.mutateAsync({
          name: reviewingTask.name,
          data: {
            status: 'Changes Required',
            progress: Math.max((reviewingTask.progress || 50) - 20, 10),
            description: updatedDesc,
          },
        });
        showToast(`Returned task ${reviewingTask.name} for changes`, 'info');
      }
      setReviewingTask(null);
      setReviewComment('');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to process task review', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Issue Handlers
  const handleCreateIssueSubmit = async (values: IssueFormValues) => {
    try {
      await createIssueMutation.mutateAsync({
        subject: values.subject,
        project: values.project,
        task: values.task,
        status: values.status,
        priority: values.priority,
        issue_type: values.issue_type,
        description: values.description,
        assigned_to: values.assigned_to,
      });
      showToast('Task issue created successfully in ERPNext!', 'success');
      setIsCreateIssueOpen(false);
      refetchIssues();
    } catch (err: any) {
      showToast(err.message || 'Failed to create issue', 'error');
    }
  };

  const handleEditIssueSubmit = async (values: IssueFormValues) => {
    if (!editingIssue) return;
    try {
      await updateIssueMutation.mutateAsync({
        name: editingIssue.name,
        data: {
          subject: values.subject,
          project: values.project,
          task: values.task,
          status: values.status,
          priority: values.priority,
          issue_type: values.issue_type,
          description: values.description,
          assigned_to: values.assigned_to,
        },
      });
      showToast(`Issue ${editingIssue.name} updated!`, 'success');
      setEditingIssue(null);
      refetchIssues();
    } catch (err: any) {
      showToast(err.message || 'Failed to update issue', 'error');
    }
  };

  const handleDeleteIssueConfirm = async (issueName: string) => {
    if (!confirm(`Delete issue ${issueName}?`)) return;
    try {
      await deleteIssueMutation.mutateAsync(issueName);
      showToast(`Issue ${issueName} deleted`, 'success');
      setViewingIssue(null);
      setEditingIssue(null);
      refetchIssues();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete issue', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
              ERPNext Task Engine
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Work Management & Execution</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Global Task Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Monitor work packages, submit deliverables for review, and track task-level engineering issues across all projects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BackButton fallbackUrl="/dashboard" />
          <ImportExportControls entityName="Tasks" dataToExport={tasks} exportFilename="pdm_tasks" />
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh ERPNext Tasks"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setMainTab('submission')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Send className="h-4 w-4 text-sky-600" />
            <span>Task Submission</span>
          </button>

          {(user?.role === 'admin' || user?.role === 'projectmanager') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xs font-sans text-xs font-bold">
        <button
          onClick={() => setMainTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            mainTab === 'tasks' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setMainTab('submission')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            mainTab === 'submission' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Task Submission ({readyForSubmissionTasks.length})</span>
          {pendingReviewTasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingReviewTasks.length} Pending Review
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('issues')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            mainTab === 'issues' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Task Issues ({issues.length})</span>
        </button>

        <button
          onClick={() => setMainTab('skip-requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
            mainTab === 'skip-requests' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Skip Requests ({skipRequests.length})</span>
          {pendingSkipCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingSkipCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: TASKS VIEW */}
      {mainTab === 'tasks' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <TaskSummaryCards summary={summary} />

          {/* Filters & Search Toolbar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks by subject, ID, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Project Filter */}
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">All Projects</option>
                {projects.map((p: Project) => (
                  <option key={p.name} value={p.name}>
                    {p.project_name || p.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Working">Working / In Progress</option>
                <option value="Submitted">Submitted / Under Review</option>
                <option value="Completed">Completed</option>
                <option value="Skipped">Skipped</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> List View
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Kanban className="h-3.5 w-3.5" /> Kanban Board
                </button>
              </div>
            </div>
          </div>

          {/* Main Content View */}
          {isLoading ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Fetching ERPNext task packages...</p>
            </div>
          ) : isError ? (
            <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
              <p className="text-xs font-bold text-rose-600">Failed to load tasks.</p>
              <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold">
                Retry
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <TaskTable
                  tasks={tasks}
                  onViewTask={(t) => setViewingTask(t)}
                  onEditTask={(t) => setEditingTask(t)}
                  onDeleteTask={(t) => setDeletingTask(t)}
                />
              ) : (
                <TaskKanban
                  tasks={tasks}
                  onViewTask={(t) => setViewingTask(t)}
                  onEditTask={(t) => setEditingTask(t)}
                  onStatusChange={async (tName, newStatus) => {
                    await updateTaskMutation.mutateAsync({
                      name: tName,
                      data: { status: newStatus },
                    });
                    refetch();
                  }}
                />
              )}

              <Pagination
                currentPage={page}
                totalPages={Math.ceil(tasks.length / pageSize) || 1}
                totalRecords={tasks.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />

              {/* Team Workload Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                <TaskWorkloadChart workloads={memberWorkloads} />
                <TaskWorkloadTable workloads={memberWorkloads} onSelectMember={() => {}} />
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: TASK SUBMISSION WORKFLOW VIEW */}
      {mainTab === 'submission' && (
        <div className="space-y-6 font-sans">
          {/* Submissions Desk Banner */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-sky-600" />
                <h2 className="text-lg font-black tracking-tight text-slate-900">Task Submission & Deliverable Verification</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl font-medium">
                Submit completed work packages for review, verify deliverable criteria, or perform formal PM sign-off.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
                <span className="text-sky-700 font-extrabold">{readyForSubmissionTasks.length}</span> Ready for Submission
              </div>
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <span className="text-amber-700 font-extrabold">{pendingReviewTasks.length}</span> Pending PM Review
              </div>
            </div>
          </div>

          {/* Section A: Pending Review Submissions (For PM / Reviewers) */}
          {pendingReviewTasks.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-amber-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Submissions Pending PM Review & Sign-off ({pendingReviewTasks.length})
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Task ID & Subject</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">Assigned Assignee</th>
                      <th className="p-3">Submitted Progress</th>
                      <th className="p-3">Open Issues</th>
                      <th className="p-3 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingReviewTasks.map((t: Task) => {
                      const openCount = taskIssueCounts[t.name] || 0;
                      return (
                        <tr key={t.name} className="hover:bg-slate-50/70">
                          <td className="p-3 font-bold text-slate-900">
                            <div>{t.subject}</div>
                            <div className="text-[10px] font-mono text-slate-400">{t.name}</div>
                          </td>
                          <td className="p-3 font-bold text-sky-700">{t.project || 'Global'}</td>
                          <td className="p-3 text-slate-800">{t.assigned_employee_name || t.assigned_to || 'Assignee'}</td>
                          <td className="p-3 font-mono font-bold text-emerald-600">{t.progress || 100}%</td>
                          <td className="p-3">
                            {openCount > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                🔴 {openCount} Issue{openCount > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-[10px] font-bold">Clear</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setReviewingTask(t)}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-xs transition"
                            >
                              Review Submission
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section B: Ready for Submission List */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-600" />
              Work Packages Ready for Submission
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Task ID & Subject</th>
                    <th className="p-3">Project</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Open Issues</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {readyForSubmissionTasks.map((t: Task) => {
                    const openCount = taskIssueCounts[t.name] || 0;
                    return (
                      <tr key={t.name} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{t.subject}</div>
                          <div className="text-[10px] font-mono text-slate-400">{t.name}</div>
                        </td>
                        <td className="p-3 font-bold text-sky-700">{t.project || 'Global'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-200">
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{t.progress || 0}%</td>
                        <td className="p-3">
                          {openCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              🔴 {openCount} Open Issue{openCount > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">0 Issues</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSubmittingTask(t);
                              setSubmissionProgress(Math.max(t.progress || 0, 100));
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition"
                          >
                            Submit Task
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TASK ISSUES VIEW */}
      {mainTab === 'issues' && (
        <div className="space-y-6 font-sans">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Task-Level Open Issues Log
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Every engineering issue belongs to a specific work package task and inherits its parent project.
              </p>
            </div>

            <button
              onClick={() => setIsCreateIssueOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task Issue</span>
            </button>
          </div>

          {/* Issues Table */}
          {isLoadingIssues ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <Loader2 className="h-6 w-6 animate-spin text-rose-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Fetching task-level issue logs from ERPNext...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Issue ID & Title</th>
                    <th className="p-3.5">Parent Task ID & Subject</th>
                    <th className="p-3.5">Parent Project ID</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Assigned To</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        No open task issues recorded.
                      </td>
                    </tr>
                  ) : (
                    issues.map((iss) => {
                      const extractedTaskId = iss.task || (iss.description?.match(/\[Task:\s*([^\]]+)\]/)?.[1]);
                      return (
                        <tr key={iss.name} className="hover:bg-slate-50/70">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{iss.subject}</div>
                            <div className="text-[10px] font-mono text-rose-700 font-bold">{iss.name}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-sky-800 font-mono">
                              {extractedTaskId || 'N/A'}
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-indigo-700 font-mono">
                            {iss.project || 'Unassigned'}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {iss.issue_type || 'Technical'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                iss.priority === 'Urgent/Critical' || iss.priority === 'High'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {iss.priority}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-200">
                              {iss.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-800 font-bold">
                            {iss.assigned_to || 'Unassigned'}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setViewingIssue(iss)}
                              className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition"
                            >
                              View Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SKIP REQUESTS APPROVAL VIEW */}
      {mainTab === 'skip-requests' && (
        <TaskSkipApprovalsView onRefreshTasks={refetch} />
      )}

      {/* Task Submission Modal */}
      {submittingTask && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <button
                onClick={() => setSubmittingTask(null)}
                className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Submit Work Package</h3>
                  <p className="text-xs text-slate-500 font-medium">{submittingTask.name} — {submittingTask.subject}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Warning if open issues present */}
                {(taskIssueCounts[submittingTask.name] || 0) > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                    <span className="font-extrabold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Task Has {taskIssueCounts[submittingTask.name]} Open Issue(s)
                    </span>
                    <p className="text-rose-700 text-[11px]">
                      This work package has unresolved issues logged. The PM reviewer will inspect issue resolution during sign-off.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Submission Progress (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={submissionProgress}
                    onChange={(e) => setSubmissionProgress(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Submission Comment & Deliverables Summary</label>
                  <textarea
                    rows={3}
                    value={submissionComment}
                    onChange={(e) => setSubmissionComment(e.target.value)}
                    placeholder="Provide notes on completed deliverables, testing results, or CAD specification release..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* File Upload Zone */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-sky-600" />
                      Supporting Deliverables & Task Documents
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, DOCX, XLSX, Images</span>
                  </label>

                  <label className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (!e.target.files) return;
                        Array.from(e.target.files).forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setSubmissionFiles((prev) => [
                              ...prev,
                              {
                                name: file.name,
                                size: file.size,
                                file,
                                dataUrl: reader.result as string,
                              },
                            ]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                    <UploadCloud className="h-5 w-5 text-sky-600" />
                    <p className="text-xs font-bold text-slate-700">Click to attach task files / deliverables</p>
                    <p className="text-[10px] text-slate-400">Files will be attached to this task & available to Stage-Gates.</p>
                  </label>

                  {/* Attached files list */}
                  {submissionFiles.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {submissionFiles.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{f.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(f.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSubmissionFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSubmittingTask(null);
                      setSubmissionFiles([]);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTaskSubmissionSubmit}
                    disabled={isSubmittingAction}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Submit Work Package</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {/* Task Review Modal (For Reviewers) */}
      {reviewingTask && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <button
                onClick={() => setReviewingTask(null)}
                className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Review Submitted Task</h3>
                  <p className="text-xs text-slate-500 font-medium">{reviewingTask.name} — {reviewingTask.subject}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">Assignee Notes:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{reviewingTask.description || 'No submission notes.'}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Reviewer Feedback Notes</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Enter approval details or specify changes required..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleReviewAction('request_changes')}
                    disabled={isSubmittingAction}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    onClick={() => handleReviewAction('approve')}
                    disabled={isSubmittingAction}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Complete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {/* Task Create / Edit Dialog */}
      <TaskFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={createTaskMutation.isPending}
      />

      {editingTask && (
        <TaskFormDialog
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditSubmit}
          initialData={editingTask}
          isLoading={updateTaskMutation.isPending}
        />
      )}

      {deletingTask && (
        <TaskDeleteDialog
          isOpen={!!deletingTask}
          onClose={() => setDeletingTask(null)}
          onConfirm={handleDeleteConfirm}
          taskSubject={deletingTask.subject || deletingTask.name}
          isLoading={deleteTaskMutation.isPending}
        />
      )}

      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onRefresh={refetch}
          onEdit={(t) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
        />
      )}

      {/* Issue Create / Edit Dialog */}
      {isCreateIssueOpen && (
        <IssueFormDialog
          isOpen={isCreateIssueOpen}
          onClose={() => setIsCreateIssueOpen(false)}
          onSubmit={handleCreateIssueSubmit}
          defaultProjectId={selectedProject !== 'ALL' ? selectedProject : undefined}
        />
      )}

      {editingIssue && (
        <IssueFormDialog
          isOpen={!!editingIssue}
          onClose={() => setEditingIssue(null)}
          onSubmit={handleEditIssueSubmit}
          initialData={editingIssue}
        />
      )}

      {viewingIssue && (
        <IssueDetailModal
          issue={viewingIssue}
          onClose={() => setViewingIssue(null)}
          onEdit={(i) => {
            setViewingIssue(null);
            setEditingIssue(i);
          }}
          onDelete={handleDeleteIssueConfirm}
        />
      )}
    </div>
  );
}
