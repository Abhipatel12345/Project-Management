import React, { useState } from 'react';
import { Task, TaskComment, TaskAttachment, TaskSubmission, TaskSubmissionAttachment } from '@/types/task.types';
import { ProjectBaseline } from '@/types/baseline.types';
import { calculateDayDiff, calculateDurationDays } from '@/services/baseline.service';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { useTaskComments, useTaskAttachments, useTask, useTaskSubmissions, useTasks } from '@/hooks/use-tasks';
import { useTaskDependencies, useDeleteDependency } from '@/hooks/use-task-dependencies';
import { AddDependencyDialog } from './dependencies/add-dependency-dialog';
import { resolveUserDisplayName } from '@/services/task.service';
import { useIssues, useCreateIssue } from '@/hooks/use-issues';
import { IssueFormDialog, IssueFormValues } from '@/components/issues/issue-form-dialog';
import { Issue } from '@/types/issue.types';
import { useToast } from '@/providers/toast-context';
import { useSkipRequests, useCreateSkipRequest } from '@/hooks/use-skip-requests';
import { TaskSkipDialog } from './task-skip-dialog';
import {
  X,
  Layers,
  FileText,
  UserCheck,
  ShieldCheck,
  Clock,
  MessageSquare,
  Paperclip,
  Calendar,
  AlertTriangle,
  BookmarkPlus,
  Plus,
  AlertCircle,
  CheckCircle2,
  FolderKanban,
  SkipForward,
  Send,
  Download,
  Eye,
  FileCheck,
  ExternalLink,
  GitFork,
  Lock,
  ArrowRight,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  activeBaseline?: ProjectBaseline | null;
  onRefresh?: () => void;
}

export function TaskDetailModal({ task, onClose, onEdit, activeBaseline, onRefresh }: TaskDetailModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'submissions' | 'issues' | 'baseline' | 'assignment' | 'rasic' | 'dependencies' | 'comments' | 'attachments'
  >('overview');
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isAddDependencyOpen, setIsAddDependencyOpen] = useState(false);

  const taskName = task?.name || '';
  const { data: freshTask } = useTask(taskName);
  const currentTask = freshTask || task;

  // Task Dependencies
  const { data: dependencyInfo, refetch: refetchDependencies } = useTaskDependencies(
    taskName,
    currentTask?.project
  );
  const { data: projectTasksData } = useTasks({
    project: currentTask?.project,
    pageSize: 100,
  });
  const projectTasks: Task[] = projectTasksData?.tasks || [];
  const deleteDepMutation = useDeleteDependency();

  const { data: comments = [] } = useTaskComments(taskName);
  const { data: attachments = [] } = useTaskAttachments(taskName);
  const { data: submissions = [] } = useTaskSubmissions(taskName);

  // Fetch skip requests for project
  const { data: skipRequests = [], refetch: refetchSkipRequests } = useSkipRequests(currentTask?.project);
  const createSkipRequestMutation = useCreateSkipRequest();

  const pendingSkipRequest = skipRequests.find(
    (r: any) => r.task_id === taskName && r.status === 'PENDING'
  );
  const rejectedSkipRequest = skipRequests.find(
    (r: any) => r.task_id === taskName && r.status === 'REJECTED'
  );

  // Fetch issues linked to this project/task
  const { data: issueListData, refetch: refetchIssues } = useIssues({
    project: task?.project,
    pageSize: 100,
  });
  const createIssueMutation = useCreateIssue();

  const allProjectIssues: Issue[] = issueListData?.issues || [];
  // Filter issues belonging specifically to this task
  const taskIssues = allProjectIssues.filter(
    (i) => i.task === taskName || i.description?.includes(`[Task: ${taskName}]`)
  );

  const issueSummary = {
    total: taskIssues.length,
    open: taskIssues.filter((i) => i.status === 'Open' || i.status === 'Replied').length,
    resolved: taskIssues.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length,
    critical: taskIssues.filter((i) => i.priority === 'Urgent/Critical' || i.priority === 'High').length,
  };

  const handleCreateIssueSubmit = async (values: IssueFormValues) => {
    if (!task) return;
    try {
      await createIssueMutation.mutateAsync({
        subject: values.subject,
        project: task.project,
        task: task.name,
        status: values.status,
        priority: values.priority,
        issue_type: values.issue_type,
        description: values.description,
        assigned_to: values.assigned_to,
      });
      showToast(`Task issue created for ${task.name}!`, 'success');
      setIsCreateIssueOpen(false);
      refetchIssues();
    } catch (err: any) {
      showToast(err.message || 'Failed to create issue', 'error');
    }
  };

  const handleSkipRequestSubmit = async (t: Task, reason: string, comment?: string) => {
    try {
      await createSkipRequestMutation.mutateAsync({
        task_id: t.name,
        task_subject: t.subject,
        project_id: t.project || 'Global Project',
        skip_reason: reason,
        additional_comment: comment,
      });
      showToast(`Skip request submitted for PM approval!`, 'success');
      setIsSkipDialogOpen(false);
      refetchSkipRequests();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit skip request', 'error');
    }
  };

  if (!task) return null;

  // Baseline comparison for current task
  const btSnapshot = activeBaseline?.tasks.find((bt) => bt.task_id === task.name);
  const curStart = task.exp_start_date?.split(' ')[0].split('T')[0] || 'N/A';
  const curEnd = task.exp_end_date?.split(' ')[0].split('T')[0] || 'N/A';
  const curDuration = calculateDurationDays(curStart, curEnd);

  const baseStart = btSnapshot?.planned_start_date || 'N/A';
  const baseEnd = btSnapshot?.planned_end_date || 'N/A';
  const baseDuration = btSnapshot?.duration || (baseStart !== 'N/A' && baseEnd !== 'N/A' ? calculateDurationDays(baseStart, baseEnd) : 0);

  const startVar = baseStart !== 'N/A' && curStart !== 'N/A' ? calculateDayDiff(baseStart, curStart) : 0;
  const endVar = baseEnd !== 'N/A' && curEnd !== 'N/A' ? calculateDayDiff(baseEnd, curEnd) : 0;
  const durVar = curDuration - baseDuration;

  const isCompletedOrSkipped = task.status === 'Completed' || task.status === 'Skipped';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header Banner */}
          <div className="p-6 bg-[#EBF5FF] border-b border-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-sky-800 bg-white px-2.5 py-0.5 rounded-full border border-sky-200">
                  {task.name}
                </span>
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />

                {pendingSkipRequest && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-600" />
                    Skip Requested (Pending PM)
                  </span>
                )}

                {taskIssues.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                    {taskIssues.length} Issue{taskIssues.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{task.subject}</h2>
              <div className="text-xs text-slate-500 font-medium">
                Project: <span className="font-bold text-slate-800">{task.project || 'Global Deliverable'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {!isCompletedOrSkipped && !pendingSkipRequest && (
                <button
                  onClick={() => setIsSkipDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Request to skip this task work package"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Request Skip</span>
                </button>
              )}

              <button
                onClick={() => setIsCreateIssueOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Issue</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Edit Task
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              Overview & Scope
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'submissions' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Send className="h-3.5 w-3.5 text-sky-600" />
              <span>Submissions & Files ({submissions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'issues' ? 'border-rose-600 text-rose-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span>Task Issues ({taskIssues.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('baseline')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'baseline' ? 'border-amber-500 text-amber-900 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-amber-500" />
              <span>Baseline Schedule & Variance</span>
            </button>

            <button
              onClick={() => setActiveTab('dependencies')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dependencies' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              <GitFork className="h-3.5 w-3.5 text-sky-600" />
              <span>
                Dependencies ({(dependencyInfo?.predecessors?.length || 0) + (dependencyInfo?.successors?.length || 0)})
              </span>
            </button>

            <button
              onClick={() => setActiveTab('assignment')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === 'assignment' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              Resource Assignment
            </button>

            <button
              onClick={() => setActiveTab('rasic')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === 'rasic' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              RASIC Matrix
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === 'comments' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              Comments ({comments.length})
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === 'attachments' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              Files ({attachments.length})
            </button>
          </div>

          {/* Modal Tab Content */}
          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Blocked Dependency Alert */}
                {dependencyInfo?.is_blocked && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-black text-amber-900">
                      <Lock className="h-4 w-4 text-amber-700 shrink-0" />
                      <span>
                        Blocked by Predecessor Task:{' '}
                        {dependencyInfo.blocked_by.map((b: { subject: string }) => b.subject).join(', ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Reason: {dependencyInfo.blocked_by[0]?.reason || 'Waiting for predecessor task to complete before this task can start.'}
                    </p>
                  </div>
                )}

                {/* Task Submission Notice & Deliverables Card */}
                {submissions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 text-xs space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-sky-600" />
                        Task Submission #{submissions[0].submission_number}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          submissions[0].status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : submissions[0].status === 'Changes Requested'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {submissions[0].status === 'Submitted' ? 'Submitted / Pending PM Review' : submissions[0].status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white border border-sky-100">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Submitted By</span>
                        <span className="font-bold text-slate-900">{submissions[0].submitted_by_name}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-sky-100">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Submitted Date</span>
                        <span className="font-bold text-slate-900">{new Date(submissions[0].submitted_at).toLocaleDateString()}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-sky-100">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Progress</span>
                        <span className="font-bold text-emerald-600 font-mono">{submissions[0].progress}%</span>
                      </div>
                    </div>

                    {submissions[0].comment && (
                      <div className="p-3 rounded-xl bg-white border border-sky-100 text-slate-700">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Submission Notes & Deliverables Summary:</span>
                        <p className="font-medium whitespace-pre-wrap">{submissions[0].comment}</p>
                      </div>
                    )}

                    {submissions[0].attachments && submissions[0].attachments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-700 block">
                          Attached Submission Deliverables ({submissions[0].attachments.length}):
                        </span>
                        {submissions[0].attachments.map((att: TaskSubmissionAttachment) => (
                          <div
                            key={att.file_id || att.file_name}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                              <span className="font-bold text-slate-900 truncate">{att.file_name}</span>
                              {att.file_size ? (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({(att.file_size / 1024).toFixed(0)} KB)
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={att.file_url || att.download_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
                              >
                                <Eye className="h-3 w-3" /> View
                              </a>
                              <a
                                href={att.download_url || att.file_url}
                                download={att.file_name}
                                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition"
                              >
                                <Download className="h-3 w-3" /> Download
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Skip Request Notice / Status Banner */}
                {pendingSkipRequest && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-black">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Task Skip Request Pending Project Manager Review</span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-amber-800">
                        Reason provided by {pendingSkipRequest.requested_by_name || pendingSkipRequest.requested_by}:
                      </div>
                      <p className="text-slate-800 font-medium">{pendingSkipRequest.skip_reason}</p>
                    </div>
                    <p className="text-[11px] text-amber-700 font-medium">
                      The task remains active and assigned. It will only be marked as Skipped once approved by the Project Manager.
                    </p>
                  </div>
                )}

                {rejectedSkipRequest && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-black text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Task Skip Request Rejected (Task Remains Active)</span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-200/60 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-rose-800">
                        Rejection Reason from Project Manager:
                      </div>
                      <p className="text-slate-800 font-medium">{rejectedSkipRequest.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {task.status === 'Skipped' && (
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-black text-purple-800">
                      <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>Work Package Status: Skipped</span>
                    </div>
                    <p className="text-[11px] text-purple-700">
                      This task work package has been formally approved as Skipped. Baseline comparisons and historical project records have been preserved.
                    </p>
                  </div>
                )}

                {/* Progress Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700">Completion Progress</span>
                    <span className="text-sky-600 font-black">{task.progress || 0}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(task.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Expected Start</div>
                    <div className="text-xs font-bold text-slate-800 font-mono">
                      {task.exp_start_date || 'Unscheduled'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Due Date</div>
                    <div className={`text-xs font-bold font-mono ${task.is_overdue ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {task.exp_end_date || 'Unscheduled'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Assigned Member</div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {task.assigned_employee_name || task.assigned_to || 'Unassigned'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Time</div>
                    <div className="text-xs font-bold text-slate-800 font-mono">
                      {task.expected_time ? `${task.expected_time} Hours` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Task Work Package Description
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                    {task.description || 'No detailed scope description provided for this work package.'}
                  </p>
                </div>

                {/* Task Dependencies Section */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                      <GitFork className="h-4 w-4 text-sky-600" />
                      Task Dependencies ({((dependencyInfo?.predecessors?.length || 0) + (dependencyInfo?.successors?.length || 0))})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddDependencyOpen(true)}
                      className="px-2.5 py-1 rounded-xl bg-sky-600 text-white text-[11px] font-bold hover:bg-sky-500 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Link Dependency
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Predecessors */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Predecessors (Must Happen Before)
                      </span>
                      {dependencyInfo?.predecessors?.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No predecessor constraints (Entry Task).</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dependencyInfo?.predecessors.map((p: any) => (
                            <div
                              key={p.dependency_id}
                              className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="truncate flex-1">
                                <span className="font-mono text-[9px] text-sky-600 block">{p.task_id}</span>
                                <span className="font-bold text-xs text-slate-900 truncate block">{p.subject}</span>
                                {p.is_blocking && (
                                  <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                                    <Lock className="h-2.5 w-2.5" /> Blocking
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-bold border border-sky-200">
                                  {p.dependency_type}
                                </span>
                                <TaskStatusBadge status={p.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Successors */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Successors (Depends on this Task)
                      </span>
                      {dependencyInfo?.successors?.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No successor constraints (Terminal Task).</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dependencyInfo?.successors.map((s: any) => (
                            <div
                              key={s.dependency_id}
                              className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="truncate flex-1">
                                <span className="font-mono text-[9px] text-sky-600 block">{s.task_id}</span>
                                <span className="font-bold text-xs text-slate-900 truncate block">{s.subject}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-bold border border-sky-200">
                                  {s.dependency_type}
                                </span>
                                <TaskStatusBadge status={s.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Issues Summary Box */}
                <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Task Issues Summary ({issueSummary.total})
                    </h4>
                    <button
                      onClick={() => setIsCreateIssueOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Raise New Issue
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-xl border border-rose-200 font-bold">
                      <span className="text-[10px] text-slate-400 block uppercase font-extrabold">Total</span>
                      <span className="text-slate-900 font-black text-sm">{issueSummary.total}</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-rose-200 font-bold">
                      <span className="text-[10px] text-rose-500 block uppercase font-extrabold">Open</span>
                      <span className="text-rose-600 font-black text-sm">{issueSummary.open}</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-rose-200 font-bold">
                      <span className="text-[10px] text-emerald-600 block uppercase font-extrabold">Resolved</span>
                      <span className="text-emerald-600 font-black text-sm">{issueSummary.resolved}</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-rose-200 font-bold">
                      <span className="text-[10px] text-purple-600 block uppercase font-extrabold">Critical</span>
                      <span className="text-purple-600 font-black text-sm">{issueSummary.critical}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ISSUES */}
            {activeTab === 'issues' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">
                    Issues Linked to Task ({task.subject})
                  </h4>
                  <button
                    onClick={() => setIsCreateIssueOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Raise New Task Issue
                  </button>
                </div>

                {taskIssues.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No issues linked to this task.</p>
                    <p className="text-[11px] text-slate-400">All work package engineering checks are clear.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-3">Issue ID & Subject</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Priority</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Assigned To</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {taskIssues.map((iss) => (
                          <tr key={iss.name} className="hover:bg-slate-50/70">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{iss.subject}</div>
                              <div className="text-[10px] font-mono text-slate-400">{iss.name}</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {iss.issue_type || 'Technical'}
                              </span>
                            </td>
                            <td className="p-3">
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
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
                                {iss.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-800 font-bold">
                              {iss.assigned_to || 'Unassigned'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BASELINE */}
            {activeTab === 'baseline' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-amber-800">
                  Baseline Variance & Schedule Drift
                </h4>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Start Variance</span>
                    <span className="font-bold text-amber-900">{startVar > 0 ? `+${startVar} Days` : `${startVar} Days`}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">End Variance</span>
                    <span className="font-bold text-amber-900">{endVar > 0 ? `+${endVar} Days` : `${endVar} Days`}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration Variance</span>
                    <span className="font-bold text-amber-900">{durVar > 0 ? `+${durVar} Days` : `${durVar} Days`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ASSIGNMENT */}
            {activeTab === 'assignment' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <h4 className="font-bold text-slate-800">Resource Assignment Details</h4>
                <p className="text-slate-600">Assigned Email: <span className="font-bold">{task.assigned_to || 'Unassigned'}</span></p>
                <p className="text-slate-600">Assigned Name: <span className="font-bold">{task.assigned_employee_name || 'N/A'}</span></p>
              </div>
            )}

            {/* TAB: RASIC */}
            {activeTab === 'rasic' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-sky-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-sky-600" />
                    RASIC Task Responsibility Matrix
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider block">R — Responsible</span>
                    <p className="font-bold text-slate-900 truncate">
                      {currentTask?.rasic?.responsible
                        ? resolveUserDisplayName(currentTask.rasic.responsible)
                        : 'Unassigned'}
                    </p>
                    <p className="text-[10px] text-slate-400">Directly completes the work package</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">A — Accountable</span>
                    <p className="font-bold text-slate-900 truncate">
                      {currentTask?.rasic?.accountable
                        ? resolveUserDisplayName(currentTask.rasic.accountable)
                        : 'Unassigned'}
                    </p>
                    <p className="text-[10px] text-slate-400">Final approving authority</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">S — Support</span>
                    <p className="font-bold text-slate-900 truncate">
                      {currentTask?.rasic?.support
                        ? resolveUserDisplayName(currentTask.rasic.support)
                        : 'None'}
                    </p>
                    <p className="text-[10px] text-slate-400">Provides technical assistance</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">C — Consulted</span>
                    <p className="font-bold text-slate-900 truncate">
                      {currentTask?.rasic?.consulted
                        ? resolveUserDisplayName(currentTask.rasic.consulted)
                        : 'None'}
                    </p>
                    <p className="text-[10px] text-slate-400">SME two-way input</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">I — Informed</span>
                    <p className="font-bold text-slate-900 truncate">
                      {currentTask?.rasic?.informed
                        ? resolveUserDisplayName(currentTask.rasic.informed)
                        : 'None'}
                    </p>
                    <p className="text-[10px] text-slate-400">Kept updated on progress</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUBMISSIONS */}
            {activeTab === 'submissions' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-sky-800 flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-sky-600" />
                    Task Submissions & Deliverable Verification History ({submissions.length})
                  </h4>
                </div>

                {submissions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <Send className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No submissions recorded for this task yet.</p>
                    <p className="text-slate-400 text-[11px]">
                      The assigned team member can submit completed work packages with deliverables from the Submit Task button.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub: TaskSubmission) => (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-extrabold text-[11px]">
                              Submission #{sub.submission_number}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                sub.status === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : sub.status === 'Changes Requested'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {sub.status === 'Submitted' ? 'Submitted / Pending PM Review' : sub.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Submitted on {new Date(sub.submitted_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Submitted By</span>
                            <span className="font-bold text-slate-900">{sub.submitted_by_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Progress Reported</span>
                            <span className="font-bold text-emerald-600 font-mono">{sub.progress}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Attached Files</span>
                            <span className="font-bold text-sky-700">{sub.attachments?.length || 0} Deliverable(s)</span>
                          </div>
                        </div>

                        {sub.comment && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Deliverables Summary / Notes:</span>
                            <p className="font-medium whitespace-pre-wrap">{sub.comment}</p>
                          </div>
                        )}

                        {sub.review_comment && (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-amber-700 block">
                              PM Review Feedback (by {sub.reviewed_by || 'Project Manager'}):
                            </span>
                            <p className="font-medium whitespace-pre-wrap">{sub.review_comment}</p>
                          </div>
                        )}

                        {/* Submission Deliverables */}
                        {sub.attachments && sub.attachments.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-extrabold uppercase text-slate-700 block">
                              Deliverable Documents ({sub.attachments.length}):
                            </span>
                            <div className="space-y-1.5">
                              {sub.attachments.map((att: TaskSubmissionAttachment) => (
                                <div
                                  key={att.file_id || att.file_name}
                                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white transition shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                                    <span className="font-bold text-slate-900 truncate">{att.file_name}</span>
                                    {att.file_size ? (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({(att.file_size / 1024).toFixed(0)} KB)
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={att.file_url || att.download_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
                                    >
                                      <Eye className="h-3 w-3" /> View
                                    </a>
                                    <a
                                      href={att.download_url || att.file_url}
                                      download={att.file_name}
                                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition"
                                    >
                                      <Download className="h-3 w-3" /> Download
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: DEPENDENCIES */}
            {activeTab === 'dependencies' && (
              <div className="space-y-5 text-xs font-sans">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <GitFork className="h-4 w-4 text-sky-600" />
                      Task Execution Dependencies & Relationships
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Control execution sequencing, predecessors, and successor handoffs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddDependencyOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Link Dependency
                  </button>
                </div>

                {/* Predecessors List */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-sky-600" />
                      Predecessor Tasks (Must Happen Before "{task.subject}")
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                      {dependencyInfo?.predecessors?.length || 0}
                    </span>
                  </div>

                  {dependencyInfo?.predecessors?.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                      <p className="font-bold text-slate-700">No Predecessors Required</p>
                      <p className="text-[11px] text-slate-400">
                        This task has no inbound dependencies and can be started immediately.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dependencyInfo?.predecessors.map((pred: any) => (
                        <div
                          key={pred.dependency_id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition ${
                            pred.is_blocking
                              ? 'bg-amber-50/70 border-amber-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-sky-600">
                                {pred.task_id}
                              </span>
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {pred.subject}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span className="font-bold text-slate-700">
                                Type: {pred.dependency_type === 'FS' ? 'Finish-to-Start (FS)' : pred.dependency_type}
                              </span>
                              <span>•</span>
                              <span>Progress: {pred.progress}%</span>
                              {pred.is_blocking && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-bold flex items-center gap-1">
                                    <Lock className="h-3 w-3" /> Waiting for completion
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <TaskStatusBadge status={pred.status} />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteDepMutation.mutateAsync({
                                    projectId: task.project || '',
                                    dependencyId: pred.dependency_id,
                                  });
                                  showToast('Dependency removed', 'info');
                                  refetchDependencies();
                                  onRefresh?.();
                                } catch (err: any) {
                                  showToast(err.message || 'Failed to remove dependency', 'error');
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Remove Link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Successors List */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                      Successor Tasks (Waiting for "{task.subject}")
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                      {dependencyInfo?.successors?.length || 0}
                    </span>
                  </div>

                  {dependencyInfo?.successors?.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-sky-500 mx-auto" />
                      <p className="font-bold text-slate-700">No Successors Configured</p>
                      <p className="text-[11px] text-slate-400">
                        No downstream deliverables are currently blocked by this task.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dependencyInfo?.successors.map((succ: any) => (
                        <div
                          key={succ.dependency_id}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:bg-slate-50/70 transition"
                        >
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-sky-600">
                                {succ.task_id}
                              </span>
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {succ.subject}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span className="font-bold text-slate-700">
                                Type: {succ.dependency_type === 'FS' ? 'Finish-to-Start (FS)' : succ.dependency_type}
                              </span>
                              <span>•</span>
                              <span>Progress: {succ.progress}%</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <TaskStatusBadge status={succ.status} />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteDepMutation.mutateAsync({
                                    projectId: task.project || '',
                                    dependencyId: succ.dependency_id,
                                  });
                                  showToast('Dependency removed', 'info');
                                  refetchDependencies();
                                  onRefresh?.();
                                } catch (err: any) {
                                  showToast(err.message || 'Failed to remove dependency', 'error');
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Remove Link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: COMMENTS */}
            {activeTab === 'comments' && (
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-800">Task Discussion ({comments.length})</h4>
                {comments.length === 0 ? (
                  <p className="text-slate-400 italic">No comments recorded yet.</p>
                ) : (
                  comments.map((c: TaskComment) => (
                    <div key={c.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-900">{c.comment_by}:</span> {c.comment}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-800">Task Deliverables & Files ({attachments.length})</h4>
                {attachments.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                    <Paperclip className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No files attached to this task.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((a: TaskAttachment) => (
                      <div
                        key={a.name || a.file_name}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs hover:bg-slate-50/60 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">{a.file_name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {a.uploaded_by && <span>By {a.uploaded_by}</span>}
                              {a.file_size && <span className="font-mono">({(a.file_size / 1024).toFixed(0)} KB)</span>}
                              {a.creation && <span>{new Date(a.creation).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={a.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            <Eye className="h-3 w-3" /> View
                          </a>
                          <a
                            href={a.file_url}
                            download={a.file_name}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Create Issue Modal for this Task */}
        {isCreateIssueOpen && (
          <IssueFormDialog
            isOpen={isCreateIssueOpen}
            onClose={() => setIsCreateIssueOpen(false)}
            onSubmit={handleCreateIssueSubmit}
            defaultProjectId={task.project}
            defaultTaskId={task.name}
            defaultTaskSubject={task.subject}
          />
        )}

        {/* Request Task Skip Modal for this Task */}
        {isSkipDialogOpen && (
          <TaskSkipDialog
            isOpen={isSkipDialogOpen}
            task={task}
            onClose={() => setIsSkipDialogOpen(false)}
            onSubmitSkipRequest={handleSkipRequestSubmit}
          />
        )}

        {/* Add Dependency Dialog */}
        {isAddDependencyOpen && (
          <AddDependencyDialog
            isOpen={isAddDependencyOpen}
            onClose={() => setIsAddDependencyOpen(false)}
            projectId={currentTask?.project || ''}
            tasks={projectTasks}
            initialSuccessorId={task.name}
            onSuccess={() => {
              refetchDependencies();
              onRefresh?.();
            }}
          />
        )}
      </div>
    </AnimatePresence>
  );
}
