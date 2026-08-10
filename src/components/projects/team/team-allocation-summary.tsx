import React from 'react';
import { Users, FolderKanban, CheckCircle2, UserX, Layers, Activity, TrendingUp } from 'lucide-react';

interface TeamAllocationSummaryProps {
  totalProjects: number;
  projectsWithTeams: number;
  projectsWithoutTeams: number;
  totalTeamMembers: number;
  activeTeamMembers: number;
  totalAssignedTasks: number;
  avgUtilization: number;
}

export function TeamAllocationSummary({
  totalProjects,
  projectsWithTeams,
  projectsWithoutTeams,
  totalTeamMembers,
  activeTeamMembers,
  totalAssignedTasks,
  avgUtilization,
}: TeamAllocationSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-sans">
      {/* Total Projects */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Total Programs</span>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <FolderKanban className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">{totalProjects}</div>
        <div className="text-[10px] text-slate-400 font-medium">Active & planned</div>
      </div>

      {/* Projects With Teams */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>With Teams</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-emerald-600">{projectsWithTeams}</div>
        <div className="text-[10px] text-slate-400 font-medium">Allocated programs</div>
      </div>

      {/* Projects Without Teams */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Without Teams</span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <UserX className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-amber-600">{projectsWithoutTeams}</div>
        <div className="text-[10px] text-slate-400 font-medium">Needs staffing</div>
      </div>

      {/* Total Team Members */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Total Members</span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-blue-600">{totalTeamMembers}</div>
        <div className="text-[10px] text-slate-400 font-medium">Engineers allocated</div>
      </div>

      {/* Active Team Members */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Active Members</span>
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-indigo-600">{activeTeamMembers}</div>
        <div className="text-[10px] text-slate-400 font-medium">Currently assigned</div>
      </div>

      {/* Total Assigned Tasks */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Assigned Tasks</span>
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-purple-600">{totalAssignedTasks}</div>
        <div className="text-[10px] text-slate-400 font-medium">Work packages</div>
      </div>

      {/* Avg Utilization */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Avg Utilization</span>
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-teal-600">{avgUtilization}%</div>
        <div className="text-[10px] text-slate-400 font-medium">Completion rate</div>
      </div>
    </div>
  );
}
