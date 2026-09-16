'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjects, useProject } from '@/hooks/use-projects';
import { Project } from '@/types/project.types';
import { ProjectPlanningTab } from '@/components/projects/planning/project-planning-tab';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  CalendarDays,
  FolderKanban,
  Search,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';

export default function ProjectGanttPage() {
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
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].name);
    }
  }, [projectParam, projects, selectedProjectId]);

  const { data: selectedProject } = useProject(selectedProjectId || '');

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.replace(`/projects/gantt?project=${encodeURIComponent(projectId)}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8 font-sans">
      {/* Header Banner & Project Selector Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shadow-2xs">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              Project Gantt Tab
              {selectedProjectId && (
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-mono font-bold">
                  {selectedProjectId}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Standard Inteva project time plan with PDP deliverables, dependencies, and Gate milestones.
            </p>
          </div>
        </div>

        {/* Project Dropdown Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Switch Project:</label>
          <div className="relative min-w-[240px]">
            <SearchableSelect
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value)}
              searchPlaceholder="Search project..."
              className="w-full pl-3 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition cursor-pointer shadow-2xs"
            >
              {projects.map((p: Project) => (
                <option key={p.name} value={p.name}>
                  {p.name} - {p.project_name || 'Unnamed Project'}
                </option>
              ))}
            </SearchableSelect>
          </div>
        </div>
      </div>

      {/* Main Gantt View for Selected Project */}
      {selectedProjectId && (
        <ProjectPlanningTab
          projectId={selectedProjectId}
          projectName={selectedProject?.project_name || selectedProjectId}
        />
      )}
    </div>
  );
}
