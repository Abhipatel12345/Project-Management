import React, { useState } from 'react';
import { Task, TaskComment, TaskAttachment } from '@/types/task.types';
import { ProjectBaseline } from '@/types/baseline.types';
import { calculateDayDiff, calculateDurationDays } from '@/services/baseline.service';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { useTaskComments, useTaskAttachments } from '@/hooks/use-tasks';
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
    'overview' | 'issues' | 'baseline' | 'assignment' | 'rasic' | 'dependencies' | 'comments' | 'attachments'
  >('overview');
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);

  const taskName = task?.name || '';
  const { data: comments = [] } = useTaskComments(taskName);
  const { data: attachments = [] } = useTaskAttachments(taskName);

  // Fetch skip requests for project
  const { data: skipRequests = [], refetch: refetchSkipRequests } = useSkipRequests(task?.project);
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
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === 'overview' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              Overview & Scope
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
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <h4 className="font-bold text-slate-800">RASIC Responsibility Matrix</h4>
                <p className="text-slate-600">Responsible: <span className="font-bold">{task.rasic?.responsible || 'N/A'}</span></p>
                <p className="text-slate-600">Accountable: <span className="font-bold">{task.rasic?.accountable || 'N/A'}</span></p>
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
                <h4 className="font-bold text-slate-800">Task Deliverables & Attachments ({attachments.length})</h4>
                {attachments.length === 0 ? (
                  <p className="text-slate-400 italic">No files attached to this task.</p>
                ) : (
                  attachments.map((a: TaskAttachment) => (
                    <div key={a.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-800">{a.file_name}</span>
                      <a href={a.file_url} target="_blank" rel="noreferrer" className="text-sky-600 font-bold">Download</a>
                    </div>
                  ))
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
      </div>
    </AnimatePresence>
  );
}
