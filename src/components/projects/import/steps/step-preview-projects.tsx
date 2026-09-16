'use client';

import React, { useState } from 'react';
import { ParsedProjectItem } from '@/types/excel-import.types';
import {
  FolderKanban,
  Layers,
  FileCheck,
  ListTodo,
  Users,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign,
  Tag,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface StepPreviewProjectsProps {
  projects: ParsedProjectItem[];
  onBack: () => void;
  onExecuteImport: () => void;
  isLoading?: boolean;
}

export function StepPreviewProjects({
  projects,
  onBack,
  onExecuteImport,
  isLoading = false,
}: StepPreviewProjectsProps) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    projects[0]?.projectIdentifier || null
  );

  const validProjects = projects.filter((p) => p.isValid);

  // Compute roll-up totals
  const totalProjects = validProjects.length;
  const totalPhases = validProjects.reduce((acc, p) => acc + p.phases.length, 0);
  const totalMilestones = validProjects.reduce(
    (acc, p) => acc + p.phases.filter((ph) => Boolean(ph.milestone)).length,
    0
  );
  const totalTasks = validProjects.reduce((acc, p) => acc + p.allTasks.length, 0);
  const totalDeliverables = validProjects.reduce((acc, p) => acc + p.deliverablesCount, 0);

  const allTeamMembers = new Set<string>();
  validProjects.forEach((p) => {
    p.teamMembers.forEach((m) => allTeamMembers.add(m));
  });

  return (
    <div className="space-y-6">
      {/* High-Level Overview Header */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-sky-200 mb-1">
            <Sparkles className="h-4 w-4" />
            <span>ENTERPRISE BULK IMPORT PREVIEW</span>
          </div>
          <h3 className="text-xl font-black">
            Ready to Create {totalProjects} Project{totalProjects !== 1 ? 's' : ''} in One Operation
          </h3>
          <p className="text-xs text-sky-100 mt-1 max-w-xl leading-relaxed">
            All project charters, APQP phases, gate milestones, engineering work packages, and deliverables will be created and committed cleanly into PDM and ERPNext.
          </p>
        </div>

        <button
          type="button"
          onClick={onExecuteImport}
          disabled={isLoading || totalProjects === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-black text-sm shadow-lg transition transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <span>Create All {totalProjects} Projects</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Projects
          </div>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {totalProjects}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Phases
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {totalPhases}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Milestones
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {totalMilestones}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Tasks
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalTasks}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Deliverables
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {totalDeliverables}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Team Members
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">
            {allTeamMembers.size}
          </div>
        </div>
      </div>

      {/* Projects Detailed Breakdown List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
            Project Breakdown ({validProjects.length})
          </h4>
          <span className="text-[11px] text-slate-500">
            Expand any project to review its full phase, task, and deliverable structure
          </span>
        </div>

        <div className="space-y-3">
          {validProjects.map((proj, pIdx) => {
            const isExpanded = expandedProjectId === proj.projectIdentifier;

            return (
              <div
                key={proj.projectIdentifier}
                className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div
                  onClick={() =>
                    setExpandedProjectId(isExpanded ? null : proj.projectIdentifier)
                  }
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 font-bold text-xs shrink-0">
                      #{pIdx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-black text-slate-900 truncate">
                          {proj.projectName}
                        </h5>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                          {proj.projectIdentifier}
                        </span>
                        {proj.projectCategory && (
                          <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            {proj.projectCategory}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>PM: <strong className="text-slate-700">{proj.projectManager || 'Unassigned'}</strong></span>
                        {proj.startDate && proj.endDate && (
                          <span>
                            Dates: <strong className="text-slate-700">{proj.startDate} → {proj.endDate}</strong>
                          </span>
                        )}
                        <span>Dept: <strong className="text-slate-700">{proj.department || 'Engineering'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                        {proj.phases.length} Phases
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                        {proj.allTasks.length} Tasks
                      </span>
                      {proj.deliverablesCount > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px]">
                          {proj.deliverablesCount} Deliv.
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-4 text-xs">
                    {/* Project Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Product Group:</span>
                        <div className="font-bold text-slate-800">{proj.productGroup || 'Standard'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Project Type:</span>
                        <div className="font-bold text-slate-800">{proj.projectType || 'Internal'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Priority:</span>
                        <div className="font-bold text-slate-800">{proj.priority || 'Medium'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Cost Budget:</span>
                        <div className="font-bold text-slate-800">
                          {proj.estimatedCost !== undefined ? `$${proj.estimatedCost.toLocaleString()}` : 'Not Specified'}
                        </div>
                      </div>
                    </div>

                    {/* Phases & Tasks Table */}
                    <div className="space-y-3">
                      {proj.phases.map((ph, phIdx) => (
                        <div
                          key={phIdx}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                        >
                          <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-indigo-600" />
                              <span className="font-black text-slate-900 text-xs">
                                {ph.name}
                              </span>
                              {ph.milestone && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {ph.milestone}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {ph.tasks.length} Work Package Task{ph.tasks.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  <th className="py-2 px-3 w-8 text-center">#</th>
                                  <th className="py-2 px-3">Task Name</th>
                                  <th className="py-2 px-3">Assigned To</th>
                                  <th className="py-2 px-3">Schedule</th>
                                  <th className="py-2 px-3">Deliverable</th>
                                  <th className="py-2 px-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {ph.tasks.map((task, tIdx) => (
                                  <tr key={tIdx} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-3 text-center text-[10px] font-bold text-slate-400">
                                      {tIdx + 1}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-900 max-w-xs truncate">
                                      {task.taskName}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600">
                                      {task.assignedTo || 'Unassigned'}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                                      {task.startDate && task.endDate
                                        ? `${task.startDate} → ${task.endDate}`
                                        : 'Flexible'}
                                    </td>
                                    <td className="py-2 px-3 text-amber-700 font-medium">
                                      {task.deliverableName || '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                        {task.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
