'use client';

import React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { FileCheck, ArrowRight, FolderKanban, Calendar, DollarSign } from 'lucide-react';

export default function ProjectCharterOverviewPage() {
  const { data, isLoading } = useProjects({ page: 1, pageSize: 20 });
  const projects = data?.projects || [];

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800 mb-1">
            <FileCheck className="h-4 w-4 text-sky-600" />
            <span>PROJECT CHARTER OVERVIEW</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Active Program Charters
          </h1>
          <p className="text-xs text-slate-500">
            High-level executive review of all automotive product development charters.
          </p>
        </div>

        <Link
          href="/projects"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <FolderKanban className="h-4 w-4 text-sky-600" />
          <span>Full Project Directory</span>
        </Link>
      </div>

      {isLoading ? (
        <ProjectTableSkeleton rows={4} />
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
          <FileCheck className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Program Charters Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a project in the directory to establish its charter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div
              key={project.name}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 shadow-xs transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {project.name}
                  </span>
                  <ProjectStatusBadge status={project.status} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition">
                    {project.project_name || project.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {project.notes || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Target Date:
                  </span>
                  <span className="text-slate-800 font-bold font-mono">
                    {project.expected_end_date || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                    Estimated Budget:
                  </span>
                  <span className="text-slate-800 font-bold font-mono">
                    ${(project.estimated_cost || 0).toLocaleString()}
                  </span>
                </div>

                <Link
                  href={`/projects/${encodeURIComponent(project.name)}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-xs"
                >
                  <span>Open Full Charter</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

