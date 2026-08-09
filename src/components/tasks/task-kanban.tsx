import React from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { TaskPriorityBadge } from './task-priority-badge';
import { User, Calendar, AlertTriangle, Eye, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaskKanbanProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onStatusChange: (taskName: string, newStatus: TaskStatus) => Promise<void>;
}

const KANBAN_COLUMNS: { title: string; status: TaskStatus; color: string; border: string }[] = [
  { title: 'Open Tasks', status: 'Open', color: 'bg-sky-50 text-sky-800', border: 'border-sky-200' },
  { title: 'In Progress / Working', status: 'Working', color: 'bg-blue-50 text-blue-800', border: 'border-blue-200' },
  { title: 'Pending Review', status: 'Pending Review', color: 'bg-purple-50 text-purple-800', border: 'border-purple-200' },
  { title: 'Completed', status: 'Completed', color: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200' },
];

export function TaskKanban({
  tasks,
  onViewTask,
  onEditTask,
  onStatusChange,
}: TaskKanbanProps) {
  const getTasksForStatus = (status: TaskStatus) => {
    return tasks.filter((t) => {
      if (status === 'Working') {
        return t.status === 'Working' || t.status === 'In Progress';
      }
      return t.status === status;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      {KANBAN_COLUMNS.map((col) => {
        const columnTasks = getTasksForStatus(col.status);

        return (
          <div
            key={col.status}
            className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-xs min-h-[500px] overflow-hidden"
          >
            {/* Column Header */}
            <div className={`p-4 border-b ${col.border} ${col.color} flex items-center justify-between`}>
              <h3 className="text-xs font-black uppercase tracking-wider">{col.title}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-800 font-extrabold text-[11px] border border-slate-200 shadow-2xs">
                {columnTasks.length}
              </span>
            </div>

            {/* Column Task Cards */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-slate-50/50">
              {columnTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl my-4">
                  No {col.title.toLowerCase()}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <motion.div
                    key={task.name}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition space-y-3 group relative"
                  >
                    {/* Header: ID & Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                        {task.name}
                      </span>
                      <TaskPriorityBadge priority={task.priority} />
                    </div>

                    {/* Subject */}
                    <div>
                      <h4
                        onClick={() => onViewTask(task)}
                        className="text-xs font-bold text-slate-900 line-clamp-2 cursor-pointer hover:text-sky-600 transition"
                      >
                        {task.subject}
                      </h4>
                      {task.project && (
                        <div className="text-[10px] text-slate-400 font-semibold mt-1">
                          Project: <span className="text-slate-600">{task.project}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Progress</span>
                        <span className="font-bold text-slate-800">{task.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-sky-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(task.progress || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Date & Assignee */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{task.assigned_employee_name || task.assigned_to || 'Unassigned'}</span>
                      </div>

                      {task.exp_end_date && (
                        <div className={`flex items-center gap-1 font-mono ${task.is_overdue ? 'text-rose-600 font-bold' : ''}`}>
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{task.exp_end_date.split('-').slice(1).join('/')}</span>
                        </div>
                      )}
                    </div>

                    {/* Move Status Quick Action */}
                    <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-100">
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.name, e.target.value as TaskStatus)}
                        className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="Open">Move: Open</option>
                        <option value="Working">Move: Working</option>
                        <option value="Pending Review">Move: Pending Review</option>
                        <option value="Completed">Move: Completed</option>
                        <option value="Cancelled">Move: Cancelled</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-sky-600 transition"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 transition"
                          title="Edit Task"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
