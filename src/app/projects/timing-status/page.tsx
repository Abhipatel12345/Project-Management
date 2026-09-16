'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects, useProject } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { ProjectTimingStatusView } from '@/components/projects/timing/project-timing-status-view';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  Clock,
  ArrowRight,
  FolderKanban,
  Calendar,
  Search,
  ChevronLeft,
  ChevronDown,
  Layers,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function ProjectTimingStatusPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectParam = searchParams.get('project');

  const { data, isLoading } = useProjects({ page: 1, pageSize: 50 });
  const projects = data?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam);
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize selected project with URL query parameter
  useEffect(() => {
    if (projectParam) {
      setSelectedProjectId(projectParam);
    }
  }, [projectParam]);

  // Fetch complete details of selected project
  const { data: selectedProject, refetch: refetchProject } = useProject(selectedProjectId || '');

  const filteredProjects = projects.filter((p: Project) =>
    (p.project_name || p.name).toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.replace(`/projects/timing-status?project=${encodeURIComponent(projectId)}`);
  };

  const handleBackToOverview = () => {
    setSelectedProjectId(null);
    router.replace('/projects/timing-status');
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
              <span>All Timing Charts</span>
            </button>
          )}

          {/* Project Picker Dropdown */}
          <div className="relative min-w-[260px] sm:min-w-[340px]">
            <label htmlFor="timing-project-selector" className="sr-only">
              Select Active Program
            </label>
            <SearchableSelect
              id="timing-project-selector"
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
                  {p.name} • {p.project_name || p.name} ({p.custom_product_group || 'Unassigned'})
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
                placeholder="Filter timing charts by name..."
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

      {/* Conditional Display: Active Project Timing View vs All Programs Timing Directory */}
      {selectedProjectId && selectedProject ? (
        <ProjectTimingStatusView project={selectedProject} onRefreshProject={refetchProject} />
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800 mb-1">
                <Clock className="h-4 w-4 text-sky-600" />
                <span>MODULE #4 • PROJECT STATUS / TIMING STATUS CHART</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Program Timing Status & Benchmark Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium">
                Standard Inteva Automotive PDP Milestone tracking, dynamic Gantt synchronization, corporate Product Group benchmark comparison, and executive schedule risk assessment.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-white/90 border border-sky-200 shadow-2xs text-center">
                <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                  Total Programs
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {projects.length}
                </div>
              </div>
            </div>
          </div>

          {/* Program Cards Grid */}
          {isLoading ? (
            <ProjectTableSkeleton />
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 font-medium">
              No programs found matching the search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p: Project) => (
                <div
                  key={p.name}
                  onClick={() => handleSelectProject(p.name)}
                  className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[11px] font-bold font-mono">
                        {p.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        Type: {p.project_type || 'A'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition line-clamp-1 text-sm">
                      {p.project_name || p.name}
                    </h3>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Product Group:</span>
                      <span className="font-bold text-indigo-700">
                        {p.custom_product_group || 'Latches'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">PM:</span>
                      <span className="truncate">
                        {p.custom_project_manager || p.owner || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600 group-hover:text-sky-700">
                    <span className="flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                      <Calendar className="h-3.5 w-3.5" />
                      SOP: {p.custom_sop_date || p.expected_end_date || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>View Timing Chart</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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
