import React from 'react';
import { Project } from '@/types/project.types';
import { DocumentSummary } from '@/types/document.types';
import {
  FileText,
  FolderKanban,
  ChevronDown,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface DocumentHeaderSummaryProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  summary: DocumentSummary;
  onCreateClick: () => void;
  onRefreshClick: () => void;
  isFetching?: boolean;
}

export function DocumentHeaderSummary({
  projects,
  selectedProjectId,
  onSelectProject,
  summary,
  onCreateClick,
  onRefreshClick,
  isFetching,
}: DocumentHeaderSummaryProps) {
  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
              ERPNext Document Vault
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Product Execution Documentation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Project Documents & CAD Specifications
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage engineering, project, quality, and product development documents across active projects.
          </p>
        </div>

        {/* Action Controls: Project Filter & Upload Button */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Project Selector */}
          <div className="relative min-w-[240px]">
            <div className="absolute left-3.5 top-3 text-sky-600">
              <FolderKanban className="h-4 w-4" />
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black focus:outline-none focus:ring-2 focus:ring-sky-500 transition cursor-pointer appearance-none shadow-2xs"
            >
              <option value="ALL">All Automotive Projects</option>
              {projects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.project_name || p.name} ({p.name})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Upload / Add Document Button */}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Total Documents
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalDocuments}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-sky-700 font-bold uppercase flex items-center justify-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5 text-sky-500" />
            Project Documents
          </div>
          <div className="text-2xl font-black text-sky-600">{summary.projectDocuments}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            Recently Added
          </div>
          <div className="text-2xl font-black text-emerald-600">{summary.recentlyAdded}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-amber-500" />
            Requiring Review
          </div>
          <div className="text-2xl font-black text-amber-600">{summary.requiringReview}</div>
        </div>
      </div>
    </div>
  );
}
