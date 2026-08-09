import React from 'react';
import { MemberWorkload, Task } from '@/types/task.types';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { X, User, Building, Briefcase, CheckCircle2, AlertTriangle, Layers, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskMemberDetailModalProps {
  member: MemberWorkload | null;
  onClose: () => void;
  onViewTask: (task: Task) => void;
}

export function TaskMemberDetailModal({
  member,
  onClose,
  onViewTask,
}: TaskMemberDetailModalProps) {
  if (!member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="p-6 bg-[#EBF5FF] border-b border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white text-sky-700 border border-sky-200 flex items-center justify-center font-black text-lg shadow-xs">
                {member.employee_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
                  MEMBER TASK OVERVIEW
                </div>
                <h2 className="text-xl font-black text-slate-900">{member.employee_name}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-slate-800">{member.role || 'Team Member'}</span>
                  <span>•</span>
                  <span>{member.department || 'Engineering Unit'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer self-start sm:self-auto"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Stat Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Total Assigned</div>
                <div className="text-xl font-black text-slate-900">{member.totalAssigned}</div>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                <div className="text-[10px] text-sky-800 font-bold uppercase">Open</div>
                <div className="text-xl font-black text-sky-700">{member.open}</div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                <div className="text-[10px] text-blue-800 font-bold uppercase">In Progress</div>
                <div className="text-xl font-black text-blue-700">{member.inProgress}</div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="text-[10px] text-emerald-800 font-bold uppercase">Completed</div>
                <div className="text-xl font-black text-emerald-700">{member.completed}</div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <div className="text-[10px] text-rose-800 font-bold uppercase">Overdue</div>
                <div className="text-xl font-black text-rose-700">{member.overdue}</div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <div className="text-[10px] text-purple-800 font-bold uppercase">Completion</div>
                <div className="text-xl font-black text-purple-700">{member.completionRate}%</div>
              </div>
            </div>

            {/* Member's Task Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-sky-600" />
                  Assigned Deliverables List ({member.tasks.length})
                </h3>
              </div>

              {member.tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium border border-slate-200 rounded-2xl">
                  No active tasks assigned to {member.employee_name}.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Task ID & Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {member.tasks.map((task) => (
                        <tr
                          key={task.name}
                          onClick={() => {
                            onClose();
                            onViewTask(task);
                          }}
                          className="hover:bg-sky-50/50 transition cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">{task.subject}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{task.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <TaskStatusBadge status={task.status} />
                          </td>
                          <td className="py-3 px-4">
                            <TaskPriorityBadge priority={task.priority} />
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] font-bold">
                            {task.exp_end_date ? (
                              <span className={task.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {task.exp_end_date}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {task.progress || 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
