import React from 'react';
import { MemberWorkload } from '@/types/task.types';
import { Users, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TaskWorkloadTableProps {
  workloads: MemberWorkload[];
  onSelectMember: (member: MemberWorkload) => void;
}

export function TaskWorkloadTable({
  workloads,
  onSelectMember,
}: TaskWorkloadTableProps) {
  if (workloads.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs font-sans">
        <Users className="h-8 w-8 text-slate-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">No Team Member Allocation Data</h3>
        <p className="text-xs text-slate-500">
          Assign tasks to project team members to view workload metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs font-sans">
      <div className="p-4 border-b border-slate-100 bg-[#EBF5FF] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-600" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Team Workload & Resource Allocation
          </h3>
        </div>
        <span className="text-[11px] font-bold text-sky-700 bg-white px-2.5 py-0.5 rounded-full border border-sky-200">
          {workloads.length} Members Allocated
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Employee Name</th>
              <th className="py-3 px-4">Department & Role</th>
              <th className="py-3 px-4 text-center">Total Tasks</th>
              <th className="py-3 px-4 text-center">Open</th>
              <th className="py-3 px-4 text-center">In Progress</th>
              <th className="py-3 px-4 text-center">Completed</th>
              <th className="py-3 px-4 text-center">Overdue</th>
              <th className="py-3 px-4">Completion %</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs font-medium">
            {workloads.map((mw) => (
              <tr
                key={mw.user_email || mw.employee_name}
                onClick={() => onSelectMember(mw)}
                className="hover:bg-sky-50/50 transition cursor-pointer group"
              >
                {/* Employee Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {mw.employee_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-sky-600 transition">
                        {mw.employee_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{mw.user_email}</div>
                    </div>
                  </div>
                </td>

                {/* Department & Role */}
                <td className="py-3 px-4 text-slate-600">
                  <div className="font-bold text-slate-800 text-[11px]">{mw.role || 'Team Member'}</div>
                  <div className="text-[10px] text-slate-400">{mw.department || 'Engineering'}</div>
                </td>

                {/* Total */}
                <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">
                  {mw.totalAssigned}
                </td>

                {/* Open */}
                <td className="py-3 px-4 text-center font-bold text-sky-600">
                  {mw.open}
                </td>

                {/* In Progress */}
                <td className="py-3 px-4 text-center font-bold text-blue-600">
                  {mw.inProgress}
                </td>

                {/* Completed */}
                <td className="py-3 px-4 text-center font-bold text-emerald-600">
                  {mw.completed}
                </td>

                {/* Overdue */}
                <td className="py-3 px-4 text-center">
                  {mw.overdue > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                      <AlertTriangle className="h-3 w-3" />
                      {mw.overdue}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>

                {/* Completion Rate */}
                <td className="py-3 px-4">
                  <div className="w-28 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Rate</span>
                      <span className="font-bold text-slate-900">{mw.completionRate}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(mw.completionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMember(mw);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white transition cursor-pointer border border-transparent hover:border-slate-200"
                    title="View Member Tasks"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
