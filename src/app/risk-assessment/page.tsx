'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects, useProject } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectRiskAssessmentView } from '@/components/projects/risk/project-risk-assessment-view';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  ChevronLeft,
  ArrowRight,
  AlertTriangle,
  LayoutDashboard,
} from 'lucide-react';

export default function RiskAssessmentPage() {
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
    router.replace(`/risk-assessment?project=${encodeURIComponent(projectId)}`);
  };

  const handleBackToOverview = () => {
    setSelectedProjectId(null);
    router.replace('/risk-assessment');
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
              <span>All Risk Assessments</span>
            </button>
          )}

          {/* Project Picker Dropdown */}
          <div className="relative min-w-[260px] sm:min-w-[340px]">
            <label htmlFor="risk-project-selector" className="sr-only">
              Select Active Program
            </label>
            <SearchableSelect
              id="risk-project-selector"
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
              className="w-full pl-3.5 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 transition cursor-pointer"
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

        <div className="flex items-center gap-3">
          <Link
            href="/risk-assessment/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold transition shadow-xs"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Risk Dashboard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>6 Source Risk Areas</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <ProjectTableSkeleton />
      ) : selectedProjectId ? (
        /* Selected Project Risk Assessment View */
        <ProjectRiskAssessmentView
          projectId={selectedProjectId}
          projectName={selectedProject?.project_name || selectedProjectId}
          currentPhase={selectedProject?.current_phase || 'PL'}
        />
      ) : (
        /* Project Directory Grid */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Project Risk Assessment Directory</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an active program to evaluate risks across all 6 standard risk areas and record mandatory mitigation plans.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((p: Project) => {
              const displayName = p.project_name?.trim() || p.name;
              return (
                <div
                  key={p.name}
                  onClick={() => handleSelectProject(p.name)}
                  className="group bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                        {p.name}
                      </span>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                      {displayName}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">Phase:</span>
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                        {p.current_phase || 'PL'}
                      </span>
                    </div>
                    <span className="text-amber-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                      Assess Risks
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
