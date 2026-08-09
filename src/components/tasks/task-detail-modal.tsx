import React, { useState } from 'react';
import { Task, TaskComment, TaskAttachment } from '@/types/task.types';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export function TaskDetailModal({ task, onClose, onEdit }: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'assignment' | 'rasic' | 'dependencies' | 'comments' | 'attachments'
  >('overview');

  const taskName = task?.name || '';
  const { data: comments = [] } = useTaskComments(taskName);
  const { data: attachments = [] } = useTaskAttachments(taskName);

  if (!task) return null;

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
                    <div className="text-xs font-bold text-slate-800 font-mono">
                      {task.expected_time ? `${task.expected_time} hrs` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Assigned To</div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {task.assigned_employee_name || task.assigned_to || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    Engineering Scope & Description
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium leading-relaxed min-h-[100px]">
                    {task.description ? (
                      <p>{task.description}</p>
                    ) : (
                      <p className="text-slate-400 italic">No additional description provided for this work package.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assignment' && (
              <div className="space-y-4 font-sans">
                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white border border-sky-200 flex items-center justify-center text-sky-700 font-bold">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {task.assigned_employee_name || task.assigned_to || 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {task.assigned_to || 'No email attached'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rasic' && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  RASIC Ownership Structure
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                    <div className="font-extrabold text-sky-800 text-[10px] uppercase">R - Responsible</div>
                    <div className="font-bold text-slate-900 mt-1">{task.rasic?.responsible || 'Lead Engineer'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="font-extrabold text-blue-800 text-[10px] uppercase">A - Accountable</div>
                    <div className="font-bold text-slate-900 mt-1">{task.rasic?.accountable || 'Program Manager'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="font-extrabold text-purple-800 text-[10px] uppercase">S - Support</div>
                    <div className="font-bold text-slate-900 mt-1">{task.rasic?.support || 'CAD / Release'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="font-extrabold text-amber-800 text-[10px] uppercase">C - Consulted</div>
                    <div className="font-bold text-slate-900 mt-1">{task.rasic?.consulted || 'Quality Lead'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="font-extrabold text-emerald-800 text-[10px] uppercase">I - Informed</div>
                    <div className="font-bold text-slate-900 mt-1">{task.rasic?.informed || 'Plant Ops'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dependencies' && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Predecessor & Successor Task Dependencies
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                  {task.depends_on ? (
                    <div>
                      <span className="font-bold text-slate-800">Predecessor Task: </span>
                      {typeof task.depends_on === 'string' ? task.depends_on : 'Configured'}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">No task predecessor dependencies linked.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Comments & Engineering Audit Trail
                </h3>
                {comments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium border border-slate-200 rounded-2xl">
                    No comments posted for this task yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c: TaskComment) => (
                      <div key={c.name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-900">{c.comment_by}</span>
                          <span className="font-mono text-slate-400">{c.creation}</span>
                        </div>
                        <p className="text-xs text-slate-700">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  ERPNext Attachment Files
                </h3>
                {attachments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium border border-slate-200 rounded-2xl">
                    No file attachments linked to this task.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((f: TaskAttachment) => (
                      <div key={f.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-sky-600" />
                          <span className="font-bold text-slate-800">{f.file_name}</span>
                        </div>
                        {f.file_url && (
                          <a
                            href={f.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-sky-600 hover:bg-sky-100 transition"
                          >
                            <Download className="h-4 w-4" />
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
