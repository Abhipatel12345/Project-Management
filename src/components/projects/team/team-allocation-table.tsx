import React from 'react';
import Link from 'next/link';
import { Project } from '@/types/project.types';
import { ProjectTeamMember } from '@/types/team.types';
import { Task } from '@/types/task.types';
import { ProjectStatusBadge } from '../project-status-badge';
import { Eye, UserPlus, Users, AlertCircle, Calendar, ArrowRight, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ProjectAllocationData {
  project: Project;
  members: ProjectTeamMember[];
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  progressRate: number;
}

interface TeamAllocationTableProps {
  allocations: ProjectAllocationData[];
  onViewTeam: (data: ProjectAllocationData) => void;
  onAddMember: (projectId: string) => void;
}

export function TeamAllocationTable({
  allocations,
  onViewTeam,
  onAddMember,
}: TeamAllocationTableProps) {
  if (allocations.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs font-sans">
        <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Program Allocations Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No project records match your current filter parameters or exist in ERPNext.
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
              <th className="py-3.5 px-4">Project Name & ID</th>
              <th className="py-3.5 px-4">Program Owner</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Team Allocation</th>
              <th className="py-3.5 px-4">Tasks Breakdown</th>
              <th className="py-3.5 px-4">Overall Progress</th>
              <th className="py-3.5 px-4">Target Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs font-medium">
            {allocations.map((alloc) => {
              const { project, members, tasks, totalTasks, completedTasks, inProgressTasks, pendingTasks, progressRate } = alloc;
              const hasTeam = members.length > 0;
              const activeCount = members.filter((m) => m.status === 'Active').length;

              return (
                <motion.tr
                  key={project.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50/60 transition group"
                >
                  {/* Project Name & ID */}
                  <td className="py-3.5 px-4">
                    <div>
                      <Link
                        href={`/projects/${encodeURIComponent(project.name)}`}
                        className="font-bold text-slate-900 text-sm group-hover:text-sky-600 transition"
                      >
                        {project.project_name || project.name}
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{project.name}</div>
                    </div>
                  </td>

                  {/* Program Owner */}
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {project.owner || 'Administrator'}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <ProjectStatusBadge status={project.status} />
                  </td>

                  {/* Team Allocation */}
                  <td className="py-3.5 px-4">
                    {hasTeam ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Users className="h-3.5 w-3.5 text-sky-600" />
                          <span>{members.length} Members</span>
                        </div>
                        <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                          {activeCount} Active
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <AlertCircle className="h-3 w-3" />
                          No Team Allocated
                        </span>
                        <div>
                          <button
                            onClick={() => onAddMember(project.name)}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-700 underline cursor-pointer"
                          >
                            + Create Team
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Tasks Breakdown */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 text-[11px]">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <Layers className="h-3 w-3 text-slate-400" />
                        <span>{totalTasks} Total Tasks</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <span className="text-emerald-600">{completedTasks} Done</span>
                        <span>•</span>
                        <span className="text-blue-600">{inProgressTasks} In Prog</span>
                        <span>•</span>
                        <span className="text-sky-600">{pendingTasks} Open</span>
                      </div>
                    </div>
                  </td>

                  {/* Overall Progress */}
                  <td className="py-3.5 px-4">
                    <div className="w-28 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Progress</span>
                        <span className="font-bold text-slate-900">{progressRate}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progressRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Target Date */}
                  <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] font-bold">
                    {project.expected_end_date || 'N/A'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewTeam(alloc)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200 transition cursor-pointer"
                        title="View Team Allocation Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Team</span>
                      </button>

                      <button
                        onClick={() => onAddMember(project.name)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Add Team Member"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
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
