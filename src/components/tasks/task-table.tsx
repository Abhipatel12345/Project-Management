import React from 'react';
import Link from 'next/link';
import { Task } from '@/types/task.types';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { useSkipRequests } from '@/hooks/use-skip-requests';
import { Eye, Edit2, Trash2, Calendar, User, AlertTriangle, Clock, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/auth-context';
import { getUserRasicRole } from '@/utils/user-matcher';

interface TaskTableProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onSubmitTask?: (task: Task) => void;
}

export function TaskTable({
  tasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onSubmitTask,
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="py-3 px-4 font-bold">Task Name & ID</th>
              <th className="py-3 px-4 font-bold">Project</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold">Priority</th>
              <th className="py-3 px-4 font-bold">Assignee</th>
              <th className="py-3 px-4 font-bold">Progress</th>
              <th className="py-3 px-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {tasks.map((task, index) => {
              const isPendingSkip = pendingSkipTaskIds.has(task.name);
              const rasicRole = getUserRasicRole(task, user);

              return (
                <motion.tr
                  key={task.name}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-slate-50/80 transition-colors duration-150 group"
                >
                  {/* Task Name & ID */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 max-w-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onViewTask(task)}
                          className="font-bold text-slate-900 hover:text-sky-600 transition truncate text-left cursor-pointer"
                        >
                          {task.subject}
                        </button>
                        {isPendingSkip && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> Skip Pending
                          </span>
                        )}
                        {task.status === 'Skipped' && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-extrabold uppercase">
                            Skipped
                          </span>
                        )}
                        {rasicRole && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-black uppercase">
                            {rasicRole.key}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                        <span>{task.name}</span>
                        {task.exp_end_date && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-2.5 w-2.5" />
                            {task.exp_end_date.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4">
                    {task.project ? (
                      <Link
                        href={`/projects/${task.project}`}
                        className="font-bold text-sky-700 hover:underline hover:text-sky-800"
                      >
                        {task.project}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Global</span>
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

                  {/* Assignee */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                        {(task.assigned_employee_name || task.assigned_to || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[120px]">
                        {task.assigned_employee_name || task.assigned_to || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Progress */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold w-7 text-right">
                        {task.progress || 0}%
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onSubmitTask && task.status !== 'Completed' && task.status !== 'Cancelled' && (
                        <button
                          onClick={() => onSubmitTask(task)}
                          className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Submit Task Deliverable"
                        >
                          <Send className="h-3 w-3" />
                          <span>Submit</span>
                        </button>
                      )}
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
