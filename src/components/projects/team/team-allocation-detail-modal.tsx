import React, { useState } from 'react';
import { ProjectAllocationData } from './team-allocation-table';
import { ProjectTeamMember } from '@/types/team.types';
import { Task } from '@/types/task.types';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { ProjectStatusBadge } from '../project-status-badge';
import { X, Users, Layers, CheckCircle2, AlertTriangle, Building, Briefcase, Calendar, ShieldCheck, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamAllocationDetailModalProps {
  allocation: ProjectAllocationData | null;
  onClose: () => void;
  onAddMember: (projectId: string) => void;
}

export function TeamAllocationDetailModal({
  allocation,
  onClose,
  onAddMember,
}: TeamAllocationDetailModalProps) {
  const [selectedMember, setSelectedMember] = useState<ProjectTeamMember | null>(null);

  if (!allocation) return null;

  const { project, members, tasks, totalTasks, completedTasks, inProgressTasks, pendingTasks, progressRate } = allocation;
  const activeCount = members.filter((m) => m.status === 'Active').length;

  // Filter tasks for selected member if clicked
  const selectedMemberTasks = selectedMember
    ? tasks.filter(
        (t) =>
          t.assigned_to?.toLowerCase() === selectedMember.user_email.toLowerCase() ||
          t.assigned_employee_name?.toLowerCase() === selectedMember.employee_name.toLowerCase() ||
          t.assigned_to?.toLowerCase() === selectedMember.employee_name.toLowerCase()
      )
    : [];

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
                  {project.name}
                </span>
                <ProjectStatusBadge status={project.status} />
              </div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {project.project_name || project.name}
              </h2>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
                <span>Manager: <strong className="text-slate-800">{project.owner || 'Administrator'}</strong></span>
                <span>•</span>
                <span>Unit: <strong className="text-slate-800">{project.company || 'Engineering'}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => {
                  onClose();
                  onAddMember(project.name);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                + Add Member
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Metric Cards Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Allocated Team</div>
                <div className="text-xl font-black text-slate-900">{members.length}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="text-[10px] text-emerald-800 font-bold uppercase">Active Members</div>
                <div className="text-xl font-black text-emerald-700">{activeCount}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                <div className="text-[10px] text-sky-800 font-bold uppercase">Total Tasks</div>
                <div className="text-xl font-black text-sky-700">{totalTasks}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                <div className="text-[10px] text-blue-800 font-bold uppercase">In Progress</div>
                <div className="text-xl font-black text-blue-700">{inProgressTasks}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <div className="text-[10px] text-purple-800 font-bold uppercase">Completed</div>
                <div className="text-xl font-black text-purple-700">{completedTasks}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                <div className="text-[10px] text-teal-800 font-bold uppercase">Progress Rate</div>
                <div className="text-xl font-black text-teal-700">{progressRate}%</div>
              </div>
            </div>

            {/* Team Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-600" />
                  Allocated Program Team ({members.length})
                </h3>
              </div>

              {members.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium border border-slate-200 rounded-2xl">
                  No team members allocated to this project yet. Click "+ Add Member" above.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Employee Name</th>
                        <th className="py-3 px-4">Department & Function</th>
                        <th className="py-3 px-4">Project Role</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Assigned Tasks</th>
                        <th className="py-3 px-4 text-center">Completed</th>
                        <th className="py-3 px-4">Task Deliverables</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {members.map((m) => {
                        const mTasks = tasks.filter(
                          (t) =>
                            t.assigned_to?.toLowerCase() === m.user_email.toLowerCase() ||
                            t.assigned_employee_name?.toLowerCase() === m.employee_name.toLowerCase() ||
                            t.assigned_to?.toLowerCase() === m.employee_name.toLowerCase()
                        );
                        const mDone = mTasks.filter((t) => t.status === 'Completed').length;
                        const isSelected = selectedMember?.id === m.id;

                        return (
                          <tr
                            key={m.id}
                            onClick={() => setSelectedMember(isSelected ? null : m)}
                            className={`hover:bg-sky-50/50 transition cursor-pointer ${
                              isSelected ? 'bg-sky-50/80 font-bold' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-xs">{m.employee_name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{m.user_email}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div className="font-bold text-slate-800 text-[11px]">{m.department || 'Engineering'}</div>
                              <div className="text-[10px] text-slate-400">{m.function_name || 'Engineering Release'}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                              {m.role}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  m.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">
                              {mTasks.length}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-600">
                              {mDone}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMember(isSelected ? null : m);
                                }}
                                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 underline cursor-pointer"
                              >
                                {isSelected ? 'Hide Deliverables' : `View ${mTasks.length} Tasks`}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected Member Tasks Sub-Inspector */}
            {selectedMember && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    <h4 className="text-xs font-black text-slate-900">
                      Deliverables Assigned to {selectedMember.employee_name} ({selectedMemberTasks.length})
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500">{selectedMember.role}</span>
                </div>

                {selectedMemberTasks.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium">
                    No active tasks assigned to {selectedMember.employee_name} in this project.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMemberTasks.map((t) => (
                      <div
                        key={t.name}
                        className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{t.subject}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{t.name}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <TaskStatusBadge status={t.status} />
                          <TaskPriorityBadge priority={t.priority} />
                          <span className="font-mono text-slate-700 font-bold">{t.progress || 0}%</span>
                        </div>
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
