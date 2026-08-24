import React from 'react';
import Link from 'next/link';
import { Task } from '@/types/task.types';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { useSkipRequests } from '@/hooks/use-skip-requests';
import { Eye, Edit2, Trash2, Calendar, User, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/auth-context';

interface TaskTableProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function TaskTable({
  tasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
}: TaskTableProps) {
  const { user } = useAuth();
  const { data: skipRequests = [] } = useSkipRequests();
  const pendingSkipTaskIds = new Set(
    skipRequests.filter((r: any) => r.status === 'PENDING').map((r: any) => r.task_id)
  );

  const canDeleteTasks = user?.role === 'admin' || user?.role === 'projectmanager';
  if (tasks.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs font-sans">
        <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Tasks Available</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No task records match your current filter parameters or exist in ERPNext.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Task ID & Subject</th>
              <th className="py-3.5 px-4">Project</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Assigned To</th>
              <th className="py-3.5 px-4">Start Date</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4">Progress</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs">
            {tasks.map((task: Task) => {
              const hasPendingSkip = pendingSkipTaskIds.has(task.name);

              return (
                <motion.tr
                  key={task.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50/60 transition group"
                >
                  {/* Task ID & Subject */}
                  <td className="py-3.5 px-4">
                    <div
                      onClick={() => onViewTask(task)}
                      className="cursor-pointer group-hover:text-sky-600 transition"
                    >
                      <div className="font-bold text-slate-900 text-sm line-clamp-1">
                        {task.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>{task.name}</span>
                        {hasPendingSkip && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Skip Requested
                          </span>
                        )}
                        {task.is_overdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            OVERDUE {task.overdue_days}D
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4">
                    {task.project ? (
                      <Link
                        href={`/projects/${encodeURIComponent(task.project)}`}
                        className="font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200 text-[11px] hover:bg-sky-100 transition inline-block max-w-[150px] truncate"
                      >
                        {task.project}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Unspecified</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <TaskStatusBadge status={task.status} />
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4">
                    <TaskPriorityBadge priority={task.priority} />
                  </td>

                  {/* Assigned To */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[130px]">
                        {task.assigned_employee_name || task.assigned_to || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Start Date */}
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {task.exp_start_date || 'N/A'}
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] font-bold">
                    {task.exp_end_date ? (
                      <span className={task.is_overdue ? 'text-rose-600 font-bold' : ''}>
                        {task.exp_end_date}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">N/A</span>
                    )}
                  </td>

                  {/* Progress */}
                  <td className="py-3.5 px-4">
                    <div className="w-28 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Progress</span>
                        <span className="font-bold text-slate-800">{task.progress || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(task.progress || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                        title="View Task Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {canDeleteTasks && (
                        <button
                          onClick={() => onDeleteTask(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
