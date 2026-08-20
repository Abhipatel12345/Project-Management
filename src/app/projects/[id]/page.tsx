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
import { ProjectIssuesTab } from '@/components/projects/issues/project-issues-tab';
import { ProjectDocumentsTab } from '@/components/projects/documents/project-documents-tab';
import { ProjectDesignReviewsTab } from '@/components/projects/design-review/project-design-reviews-tab';
import { ProjectGatesTab } from '@/components/projects/gates/project-gates-tab';
import { ProjectPlanningTab } from '@/components/projects/planning/project-planning-tab';
import { ProjectConnectionsTab } from '@/components/projects/connections/project-connections-tab';
import { AccessDenied } from '@/components/shared/access-denied';
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
  Network,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = decodeURIComponent((params.id as string) || '');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

  // Workspace Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'team' | 'tasks' | 'planning' | 'documents' | 'reviews' | 'gates' | 'issues' | 'activity' | 'connections' | 'materials'
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
      throw err;
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
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg.includes('403') || errMsg.includes('Forbidden') || errMsg.includes('Access Denied')) {
      return (
        <AccessDenied
          title="403 Forbidden — Project Access Restricted"
          reason={errMsg || `You are not authorized to view Project "${projectId}" under your current ERPNext role.`}
          returnUrl="/projects"
        />
      );
    }

    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-xs font-sans">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">
          {errMsg || `Could not retrieve details for project "${projectId}".`}
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

        {/* Tab 6: Design Reviews */}
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Design Reviews</span>
        </button>

        {/* Tab 7: Stage Gates */}
        <button
          onClick={() => setActiveTab('gates')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'gates'
              ? 'bg-emerald-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          <span>Stage Gates</span>
        </button>

        {/* Tab 8: Issues */}
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

        {/* Tab 9: Activity */}
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

        {/* Tab 10: Connections */}
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'connections'
              ? 'bg-sky-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Network className="h-4 w-4" />
          <span>Connections</span>
        </button>

        {/* Tab 11: Material Requisitions */}
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'materials'
              ? 'bg-amber-600 text-white font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Material Requisitions</span>
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
                <h3 className="text-sm font-bold text-slate-900">Execution & Product Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Project Category:</span>
                    <div className="font-bold text-sky-700 mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold">
                        {project.custom_project_category || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Product Group:</span>
                    <div className="font-bold text-indigo-700 mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                        {project.custom_product_group || 'Unassigned'}
                      </span>
                    </div>
                  </div>
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
        <ProjectPlanningTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 5: DOCUMENTS */}
      {activeTab === 'documents' && (
        <ProjectDocumentsTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 6: DESIGN REVIEWS */}
      {activeTab === 'reviews' && (
        <ProjectDesignReviewsTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 7: STAGE GATES */}
      {activeTab === 'gates' && (
        <ProjectGatesTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 6: ISSUES */}
      {activeTab === 'issues' && (
        <ProjectIssuesTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
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

      {/* Tab 8: CONNECTIONS */}
      {activeTab === 'connections' && (
        <ProjectConnectionsTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 9: MATERIALS (Material Requisitions) */}
      {activeTab === 'materials' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-sky-600" /> Material Requisitions ({project.project_name})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Request prototype components and materials from the warehouse, track bin status, and confirm receipt.
              </p>
            </div>
            <Link
              href="/warehouse"
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-2 shadow-xs shrink-0"
            >
              <Boxes className="h-4 w-4" /> Open Warehouse Depot
            </Link>
          </div>

          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
            <Boxes className="h-10 w-10 text-sky-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Project Material Requisition System Active</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Material requests created here are dispatched to the Warehouse Depot. Warehouse users check stock, reserve bin items, and issue materials directly to project engineers.
            </p>
            <Link
              href="/warehouse"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition shadow-xs"
            >
              Go to Warehouse Requisition Manager <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
