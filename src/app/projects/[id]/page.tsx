'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/use-projects';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectPriorityBadge } from '@/components/projects/project-priority-badge';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { ProjectDeleteDialog } from '@/components/projects/project-delete-dialog';
import { ProjectTeamTab } from '@/components/projects/team/project-team-tab';
import { ProjectTasksTab } from '@/components/projects/tasks/project-tasks-tab';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit2,
  FolderKanban,
  Trash2,
  User,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  UserPlus,
  Layers,
  CalendarDays,
  Folder,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = decodeURIComponent((params.id as string) || '');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

  // 7 Workspace Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'team' | 'tasks' | 'planning' | 'documents' | 'issues' | 'activity'
  >('overview');

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const handleCreateTeamClick = () => {
    setActiveTab('team');
    setIsAddTeamModalOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    try {
      await updateProjectMutation.mutateAsync({
        name: projectId,
        data: values,
      });
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      router.push('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 font-sans">
        <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Project Workspace from ERPNext...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-xs font-sans">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">
          {error instanceof Error
            ? error.message
            : `Could not retrieve details for project "${projectId}".`}
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-sky-600 transition"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
          <span>Back to Projects Directory</span>
        </Link>

        {/* Header Action Triggers */}
        <div className="flex items-center gap-2">
          {/* Create Team / Add Team Member Button */}
          <button
            onClick={handleCreateTeamClick}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Team</span>
          </button>

          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <Edit2 className="h-3.5 w-3.5 text-sky-600" />
            <span>Edit Charter</span>
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 border-rose-200 text-xs font-bold transition shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Project Header Banner - Screenshot Styled Ice Blue Container */}
      <div className="p-6 rounded-2xl bg-[#EBF5FF] border border-sky-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-mono font-bold">
                {project.name}
              </span>
              <ProjectStatusBadge status={project.status} />
              <ProjectPriorityBadge priority={project.priority} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {project.project_name || project.name}
            </h1>

            <p className="text-xs text-slate-500">
              Program Type:{' '}
              <span className="text-slate-800 font-bold">
                {project.project_type || 'Internal Automotive Program'}
              </span>
            </p>
          </div>

          {/* Completion Progress Bar */}
          <div className="p-4 rounded-xl bg-white border border-sky-200/80 min-w-[240px] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Charter Completion</span>
              <span className="text-sm font-black text-sky-600">
                {project.percent_complete || 0}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(project.percent_complete || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7 Workspace Tabs Bar */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-semibold scrollbar-none bg-white p-1 rounded-xl shadow-2xs">
        {/* Tab 1: Overview */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Overview</span>
        </button>

        {/* Tab 2: Team */}
        <button
          onClick={() => setActiveTab('team')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'team'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team</span>
        </button>

        {/* Tab 3: Tasks */}
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Tasks</span>
        </button>

        {/* Tab 4: Planning */}
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'planning'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Planning</span>
        </button>

        {/* Tab 5: Documents */}
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'documents'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Folder className="h-4 w-4" />
          <span>Documents</span>
        </button>

        {/* Tab 6: Issues */}
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'issues'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Issues</span>
        </button>

        {/* Tab 7: Activity */}
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Activity Log</span>
        </button>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Expected Timeline
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                  {project.expected_start_date || 'N/A'} — {project.expected_end_date || 'N/A'}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Estimated Budget
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                  ${(project.estimated_cost || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Company & Unit
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {project.company || 'Global Automotive Group'}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Program Owner
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 truncate max-w-[140px]">
                  {project.owner || 'Administrator'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-600" />
                  <span>Charter Scope & Objectives</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {project.notes ||
                    'No charter description or engineering scope notes specified for this program record.'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Execution Parameters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Actual Start Date:</span>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {project.actual_start_date || 'Pending commencement'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Actual End Date:</span>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {project.actual_end_date || 'In Progress'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Total Costing Amount:</span>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      ${(project.total_costing_amount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Department:</span>
                    <div className="font-bold text-slate-900 mt-1">
                      {project.department || 'Vehicle Development'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">System Metadata</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">ERPNext DocType:</span>
                    <span className="font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Project</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Created:</span>
                    <span className="text-slate-800 font-bold font-mono">
                      {project.creation ? new Date(project.creation).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Last Modified:</span>
                    <span className="text-slate-800 font-bold font-mono">
                      {project.modified ? new Date(project.modified).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Modified By:</span>
                    <span className="text-slate-800 font-bold">{project.modified_by || 'Administrator'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: TEAM */}
      {activeTab === 'team' && (
        <ProjectTeamTab
          projectId={projectId}
          isCreateOpenExternal={isAddTeamModalOpen}
          onCloseExternalCreate={() => setIsAddTeamModalOpen(false)}
        />
      )}

      {/* Tab 3: TASKS */}
      {activeTab === 'tasks' && (
        <ProjectTasksTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 4: PLANNING */}
      {activeTab === 'planning' && (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto shadow-xs">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Planning & Gantt Timeline ({project.project_name})
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Interactive program schedules, APQP gate milestones, and critical path analysis.
            </p>
          </div>
          <Link
            href="/planning"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
          >
            Open Gantt Planning
          </Link>
        </div>
      )}

      {/* Tab 5: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto shadow-xs">
            <Folder className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Engineering Documents & CAD Vault ({project.project_name})
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Store DHF attachments, BOM specifications, CAD drawings, and compliance sign-offs.
            </p>
          </div>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
          >
            Open Document Vault
          </Link>
        </div>
      )}

      {/* Tab 6: ISSUES */}
      {activeTab === 'issues' && (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Open Defects & Problem Reports ({project.project_name})
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Engineering issue triage, non-conformance reports, and 8D problem solving.
            </p>
          </div>
          <Link
            href="/issues"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs"
          >
            Open Issue Tracker
          </Link>
        </div>
      )}

      {/* Tab 7: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto shadow-xs">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              System Audit Trail & Version Logs ({project.project_name})
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Real-time audit log of team member additions, charter modifications, and gate sign-offs.
            </p>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      <ProjectFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={project}
        isLoading={updateProjectMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ProjectDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        projectName={project.project_name || project.name}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
}
