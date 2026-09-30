'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects, useProject } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectScorecardView } from '@/components/projects/scorecard/project-scorecard-view';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import Link from 'next/link';
import {
  Target,
  Search,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function ScorecardPage() {
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
    router.replace(`/scorecard?project=${encodeURIComponent(projectId)}`);
  };

  const handleBackToOverview = () => {
    setSelectedProjectId(null);
    router.replace('/scorecard');
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
              <span>All Project Scorecards</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Imperative Scorecard & Financial KPIs</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                  Authoritative
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Track program financials, PRB, AR stretch targets, and lifecycle ROI
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[280px]">
          <SearchableSelect
            options={projects.map((p: Project) => ({
              value: p.name,
              label: `${p.name} - ${p.project_name}`,
            }))}
            value={selectedProjectId || ''}
            onChange={(val) => handleSelectProject(val)}
            placeholder="Switch Program / Project..."
            className="w-full text-xs"
          />
        </div>
      </div>

      {/* Main View: Project View or Project Directory */}
      {selectedProjectId ? (
        <ProjectScorecardView
          projectId={selectedProjectId}
          projectName={selectedProject?.project_name || selectedProjectId}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Description Card */}
          <div className="p-8 rounded-3xl bg-linear-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                <span>Financial & Business Case Governance</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Imperative Scorecard Management
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
                Select a program below to review and manage financial statistics, unit operating costs,
                appropriation requests (AR), and Operating Income (%) baselines. Values are
                synchronized into Flawless Launch evaluations.
              </p>
            </div>
          </div>

          {/* Directory Search & Filter */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs by name or project code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Showing {filteredProjects.length} active programs
            </div>
          </div>

          {/* Projects Table */}
          {isLoading ? (
            <ProjectTableSkeleton />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3.5">Project ID</th>
                    <th className="px-5 py-3.5">Project Name</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Target Finish</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProjects.map((p: Project) => (
                    <tr
                      key={p.name}
                      onClick={() => handleSelectProject(p.name)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-700">
                        {p.name}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {p.project_name}
                      </td>
                      <td className="px-5 py-3.5">
                        <ProjectStatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {p.custom_project_category || p.project_type || 'Cat A'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        {p.expected_end_date || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition">
                          <span>Open Scorecard</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        No programs found matching &ldquo;{searchTerm}&rdquo;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
