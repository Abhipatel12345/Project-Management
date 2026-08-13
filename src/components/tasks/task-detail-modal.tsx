import React, { useState } from 'react';
import { Task, TaskComment, TaskAttachment } from '@/types/task.types';
import { ProjectBaseline } from '@/types/baseline.types';
import { calculateDayDiff, calculateDurationDays } from '@/services/baseline.service';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { useTaskComments, useTaskAttachments } from '@/hooks/use-tasks';
import {
  X,
  Layers,
  FileText,
  UserCheck,
  ShieldCheck,
  Clock,
  GitCommit,
  MessageSquare,
  Paperclip,
  Calendar,
  AlertTriangle,
  Download,
  BookmarkPlus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  activeBaseline?: ProjectBaseline | null;
}

export function TaskDetailModal({ task, onClose, onEdit, activeBaseline }: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'baseline' | 'assignment' | 'rasic' | 'dependencies' | 'comments' | 'attachments'
  >('overview');

  const taskName = task?.name || '';
  const { data: comments = [] } = useTaskComments(taskName);
  const { data: attachments = [] } = useTaskAttachments(taskName);

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="p-6 bg-[#EBF5FF] border-b border-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-sky-800 bg-white px-2.5 py-0.5 rounded-full border border-sky-200">
                  {task.name}
                </span>
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{task.subject}</h2>
              <div className="text-xs text-slate-500 font-medium">
                Project: <span className="font-bold text-slate-800">{task.project || 'Global Deliverable'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
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
              onClick={() => setActiveTab('dependencies')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                activeTab === 'dependencies' ? 'border-sky-600 text-sky-700 font-extrabold' : 'border-transparent hover:text-slate-900'
              }`}
            >
              Dependencies & Gantt
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
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Hours</div>
                    <div className="text-xs font-bold text-slate-800">
                      {task.expected_time ? `${task.expected_time} hrs` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Assigned Engineer</div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {task.assigned_employee_name || task.assigned_to || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Task Description & Engineering Scope
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                    {task.description || 'No description provided for this work package.'}
                  </div>
                </div>
              </div>
            )}

            {/* Baseline Schedule & Variance Tab */}
            {activeTab === 'baseline' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-mono text-[10px] font-bold">
                      {activeBaseline?.baseline_name || 'Baseline Reference'}
                    </span>
                    <span className="text-xs text-amber-900 font-black">Plan vs Actual Schedule Comparison</span>
                  </div>
                  <p className="text-xs text-amber-800/90 font-medium">
                    Compares current task schedule dates against frozen baseline snapshot.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Start Variance Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Start Date Comparison</div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-500">{baseStart}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="font-bold text-slate-900">{curStart}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Start Variance</span>
                      <span className={`font-black ${startVar > 0 ? 'text-rose-600' : startVar < 0 ? 'text-sky-600' : 'text-emerald-600'}`}>
                        {startVar === 0 ? 'On Time' : startVar > 0 ? `+${startVar} days delayed` : `${startVar} days ahead`}
                      </span>
                    </div>
                  </div>

                  {/* End Variance Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">End Date Comparison</div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-500">{baseEnd}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="font-bold text-slate-900">{curEnd}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">End Variance</span>
                      <span className={`font-black ${endVar > 0 ? 'text-rose-600' : endVar < 0 ? 'text-sky-600' : 'text-emerald-600'}`}>
                        {endVar === 0 ? 'On Time' : endVar > 0 ? `+${endVar} days delayed` : `${endVar} days ahead`}
                      </span>
                    </div>
                  </div>

                  {/* Duration Variance Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Duration Comparison</div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-500">{baseDuration} days</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="font-bold text-slate-900">{curDuration} days</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Duration Variance</span>
                      <span className={`font-black ${durVar > 0 ? 'text-rose-600' : durVar < 0 ? 'text-sky-600' : 'text-emerald-600'}`}>
                        {durVar === 0 ? 'Same Duration' : durVar > 0 ? `+${durVar} days longer` : `${durVar} days shorter`}
                      </span>
                    </div>
                  </div>
                </div>

                {btSnapshot && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">Snapshot Record Details</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                      <div>Baseline ID: <strong className="font-mono text-slate-900">{btSnapshot.baseline_id}</strong></div>
                      <div>Baseline Progress: <strong className="text-slate-900">{btSnapshot.progress || 0}%</strong></div>
                      <div>Baseline Priority: <strong className="text-slate-900">{btSnapshot.priority || 'Medium'}</strong></div>
                      <div>Baseline Status: <strong className="text-slate-900">{btSnapshot.status || 'Open'}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assignment Tab */}
            {activeTab === 'assignment' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  Assigned Team Member & Department
                </h3>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs font-medium text-slate-700">
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-400">Assigned Person / Lead</span>
                    <span className="font-bold text-slate-900">{task.assigned_employee_name || task.assigned_to || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-400">Department</span>
                    <span className="font-bold text-slate-900">{task.assigned_department || task.department || 'Engineering Systems'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Role / Designation</span>
                    <span className="font-bold text-slate-900">{task.assigned_role || 'Systems Lead'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* RASIC Tab */}
            {activeTab === 'rasic' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  RASIC Responsibility Assignment Matrix
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-extrabold text-sky-700 block">Responsible (R)</span>
                    <span className="text-slate-800 font-bold">{task.rasic?.responsible || task.assigned_to || 'Unassigned'}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-extrabold text-blue-700 block">Accountable (A)</span>
                    <span className="text-slate-800 font-bold">{task.rasic?.accountable || 'Project Manager'}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-extrabold text-emerald-700 block">Support (S)</span>
                    <span className="text-slate-800 font-bold">{task.rasic?.support || 'CAD Team'}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-extrabold text-purple-700 block">Consulted (C)</span>
                    <span className="text-slate-800 font-bold">{task.rasic?.consulted || 'Quality Manager'}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="font-extrabold text-slate-700 block">Informed (I)</span>
                    <span className="text-slate-800 font-bold">{task.rasic?.informed || 'Executive Lead'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dependencies Tab */}
            {activeTab === 'dependencies' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <GitCommit className="h-4 w-4 text-slate-400" />
                  Predecessors & Parent Work Package
                </h3>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-400 font-medium">Parent Task</span>
                    <span className="font-bold font-mono text-sky-800">{task.parent_task || 'Root Work Package'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Predecessor Dependencies</span>
                    <span className="font-bold text-slate-900">
                      {typeof task.depends_on === 'string' ? task.depends_on : 'No Predecessors'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  Engineering Activity Log & Comments
                </h3>
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    No discussion comments logged on this task.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c: TaskComment) => (
                      <div key={c.name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500 font-medium text-[11px]">
                          <span className="font-bold text-slate-800">{c.comment_by}</span>
                          <span>{c.creation}</span>
                        </div>
                        <p className="text-slate-700 font-medium">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  Attached CAD Models & Specifications
                </h3>
                {attachments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    No files attached to this task.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((a: TaskAttachment) => (
                      <div key={a.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="font-bold text-slate-800 truncate max-w-[280px]">{a.file_name}</div>
                        {a.file_url && (
                          <a
                            href={a.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-sky-50 text-sky-700 font-bold text-[11px] border border-sky-200 hover:bg-sky-100 transition"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
