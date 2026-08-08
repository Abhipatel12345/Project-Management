'use client';

import React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectPriorityBadge } from '@/components/projects/project-priority-badge';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { FileCheck, ArrowRight, FolderKanban, Calendar, DollarSign } from 'lucide-react';

export default function ProjectCharterOverviewPage() {
  const { data, isLoading } = useProjects({ page: 1, pageSize: 20 });
  const projects = data?.projects || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 mb-1">
            <FileCheck className="h-4 w-4" />
            <span>PROJECT CHARTER OVERVIEW</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Active Program Charters
          </h1>
          <p className="text-xs text-slate-400">
            High-level executive review of all automotive product development charters.
          </p>
        </div>

        <Link
          href="/projects"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition"
        >
          <FolderKanban className="h-4 w-4" />
          <span>Full Project Directory</span>
        </Link>
      </div>

      {isLoading ? (
        <ProjectTableSkeleton rows={4} />
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <FileCheck className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Program Charters Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create a project in the directory to establish its charter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div
              key={project.name}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {project.name}
                  </span>
                  <ProjectStatusBadge status={project.status} />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-400 transition">
                    {project.project_name || project.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {project.notes || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800/60 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Target:
                  </span>
                  <span className="text-slate-200 font-medium">
                    {project.expected_end_date || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Budget:
                  </span>
                  <span className="text-slate-200 font-medium">
                    ${(project.estimated_cost || 0).toLocaleString()}
                  </span>
                </div>

                <Link
                  href={`/projects/${encodeURIComponent(project.name)}`}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition"
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
