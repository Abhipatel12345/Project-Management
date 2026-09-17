'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects, useProject } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectFlawlessLaunchView } from '@/components/projects/flawless-launch/project-flawless-launch-view';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import {
  Rocket,
  Search,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';

export default function ProjectFlawlessLaunchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectParam = searchParams.get('project');

  const { data, isLoading } = useProjects({ page: 1, pageSize: 200 });
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
  const { data: selectedProject } = useProject(selectedProjectId || '');

  const filteredProjects = projects.filter((p: Project) =>
    (p.project_name || p.name).toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.replace(`/projects/flawless-launch?project=${encodeURIComponent(projectId)}`);
  };

  const handleBackToOverview = () => {
    setSelectedProjectId(null);
    router.replace('/projects/flawless-launch');
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
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>All Launch Trackers</span>
            </button>
          )}

          {/* Project Picker Dropdown */}
          <div className="relative min-w-[260px] sm:min-w-[340px]">
            <label htmlFor="flm-project-selector" className="sr-only">
              Select Active Program
            </label>
            <SearchableSelect
              id="flm-project-selector"
              aria-label="Select Active Program"
              value={selectedProjectId || ''}
              displayValue={selectedProject?.project_name}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectProject(e.target.value);
                } else {
                  handleBackToOverview();
                }
              }}
              searchPlaceholder="Search active program..."
              className="w-full pl-3.5 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">-- Select Active Program --</option>
              {projects.map((p: Project) => {
                const displayName = p.project_name?.trim() || p.name;
                return (
                  <option
                    key={p.name}
                    value={p.name}
                    data-sublabel={displayName !== p.name ? p.name : undefined}
                  >
                    {displayName}
                  </option>
                );
              })}
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
                placeholder="Filter programs by name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main View */}
      {selectedProjectId ? (
        <ProjectFlawlessLaunchView
          key={selectedProjectId}
          projectId={selectedProjectId}
          projectName={selectedProject?.project_name || selectedProjectId}
          currentGate={(selectedProject?.custom_pdp_category || selectedProject?.project_type || 'PL') as any}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-[#F0FDF4] border border-emerald-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-emerald-800 mb-1">
                <Rocket className="h-4 w-4 text-emerald-600" />
                <span>FLAWLESS LAUNCH MANAGEMENT DIRECTORY</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Active Program Flawless Launch Trackers
              </h1>
              <p className="text-xs text-slate-500">
                Gate-wise performance evaluation across 5 key delivery & financial metrics derived from Gantt and Imperative Scorecard.
              </p>
            </div>
          </div>

          {isLoading ? (
            <ProjectTableSkeleton rows={4} />
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <Rocket className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Programs Match</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active projects found matching &ldquo;{searchTerm}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project: Project) => (
                <div
                  key={project.name}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {project.name}
                      </span>
                      <ProjectStatusBadge status={project.status} />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition">
                        {project.project_name || project.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {project.notes || 'Automotive Launch Program.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectProject(project.name)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                    >
                      <span>Open FLM Evaluation</span>
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
