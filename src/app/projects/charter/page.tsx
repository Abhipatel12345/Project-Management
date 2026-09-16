'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects, useProject } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { ProjectCharterView } from '@/components/projects/charter/project-charter-view';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  FileCheck,
  ArrowRight,
  FolderKanban,
  Calendar,
  DollarSign,
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';

export default function ProjectCharterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectParam = searchParams.get('project');

  const { data, isLoading } = useProjects({ page: 1, pageSize: 50 });
  const projects = data?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync selected project with URL query param
  useEffect(() => {
    if (projectParam) {
      setSelectedProjectId(projectParam);
    }
  }, [projectParam]);

  // Fetch full details of selected project
  const { data: selectedProject, refetch: refetchProject } = useProject(selectedProjectId || '');

  const filteredProjects = projects.filter((p: Project) =>
    (p.project_name || p.name).toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.replace(`/projects/charter?project=${encodeURIComponent(projectId)}`);
  };

  const handleBackToOverview = () => {
    setSelectedProjectId(null);
    router.replace('/projects/charter');
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Project Selector & Navigation Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedProjectId && (
            <button
              type="button"
              onClick={handleBackToOverview}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>All Charters</span>
            </button>
          )}

          {/* Project Picker Dropdown */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <label htmlFor="charter-project-selector" className="sr-only">
              Select Active Program
            </label>
            <SearchableSelect
              id="charter-project-selector"
              aria-label="Select Active Program"
              value={selectedProjectId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectProject(e.target.value);
                } else {
                  handleBackToOverview();
                }
              }}
              searchPlaceholder="Search active program..."
              className="w-full pl-3.5 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="">-- Select Active Program --</option>
              {projects.map((p: Project) => (
                <option key={p.name} value={p.name}>
                  {p.name} • {p.project_name || p.name}
                </option>
              ))}
            </SearchableSelect>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!selectedProjectId && (
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter charters by name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
              />
            </div>
          )}

          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs shrink-0"
          >
            <FolderKanban className="h-3.5 w-3.5 text-sky-600" />
            <span className="hidden sm:inline">Project Directory</span>
          </Link>
        </div>
      </div>

      {/* Conditional Display: Full Charter View vs Active Program Charters Grid */}
      {selectedProjectId && selectedProject ? (
        <ProjectCharterView key={selectedProject.name} project={selectedProject} onRefresh={refetchProject} />
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800 mb-1">
                <FileCheck className="h-4 w-4 text-sky-600" />
                <span>PROJECT CHARTER DIRECTORY</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Active Program Charters
              </h1>
              <p className="text-xs text-slate-500">
                Select a project below or use the selector above to open and edit its complete Charter.
              </p>
            </div>
          </div>

          {isLoading ? (
            <ProjectTableSkeleton rows={4} />
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <FileCheck className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Program Charters Match</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active projects found matching &ldquo;{searchTerm}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project: Project) => (
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
                        Type / Category:
                      </span>
                      <span className="text-slate-800 font-bold font-mono">
                        Category {project.project_type || 'A'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectProject(project.name)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                    >
                      <span>Open Full Charter</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
