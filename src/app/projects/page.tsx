'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/use-projects';
import { Project, ProjectStatus, ProjectPriority } from '@/types/project.types';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectPriorityBadge } from '@/components/projects/project-priority-badge';
import { ProjectTableSkeleton } from '@/components/projects/project-table-skeleton';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { ProjectDeleteDialog } from '@/components/projects/project-delete-dialog';
import { BackButton } from '@/components/shared/back-button';
import { Pagination } from '@/components/shared/pagination';
import { ImportExportControls } from '@/components/shared/import-export-controls';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  FolderOpen,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectsPage() {
  const router = useRouter();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [priority, setPriority] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // TanStack Query Hooks
  const { data, isLoading, isError, error, refetch, isFetching } = useProjects({
    search,
    status,
    priority,
    page,
    pageSize,
  });

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPriority('ALL');
    setPage(1);
  };

  // Submit Create Project
  const handleCreateSubmit = async (values: any) => {
    try {
      setActionError(null);
      const created = await createProjectMutation.mutateAsync(values);
      setActionSuccess(`Project "${values.project_name}" created successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      return created;
    } catch (err: any) {
      const msg = err.message || err.response?.data?._error_message || err.response?.data?.error || 'Failed to create project.';
      const isFieldValidationError =
        /project\s*name\s*must\s*be\s*unique/i.test(msg) ||
        /project\s*code\s*must\s*be\s*unique/i.test(msg) ||
        err.response?.data?.field === 'project_name' ||
        err.response?.data?.field === 'name';

      // Keep global error only for genuine server/network errors; suppress for field validation inside modal
      if (!isFieldValidationError) {
        setActionError(msg);
      }
      throw err;
    }
  };

  // Submit Edit Project
  const handleEditSubmit = async (values: any) => {
    if (!editingProject) return;
    try {
      setActionError(null);
      await updateProjectMutation.mutateAsync({
        name: editingProject.name,
        data: values,
      });
      setActionSuccess(`Project "${editingProject.project_name}" updated successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      setEditingProject(null);
    } catch (err: any) {
      const msg = err.message || err.response?.data?._error_message || err.response?.data?.error || 'Failed to update project.';
      const isFieldValidationError =
        /project\s*name\s*must\s*be\s*unique/i.test(msg) ||
        /project\s*code\s*must\s*be\s*unique/i.test(msg) ||
        err.response?.data?.field === 'project_name' ||
        err.response?.data?.field === 'name';

      if (!isFieldValidationError) {
        setActionError(msg);
      }
      throw err;
    }
  };

  // Submit Delete Project
  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    try {
      setActionError(null);
      await deleteProjectMutation.mutateAsync(deletingProject.name);
      setActionSuccess(`Project "${deletingProject.project_name}" deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setDeletingProject(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete project.');
    }
  };

  const projects = data?.projects || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Notifications Banners */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header Banner */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800 mb-1">
            <FolderKanban className="h-4 w-4 text-sky-600" />
            <span>AUTOMOTIVE PROGRAM & PROJECT DIRECTORY</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Project Directory</h1>
          <p className="text-xs text-slate-500">
            Manage automotive product programs, charter scopes, and lifecycle progression.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <BackButton fallbackUrl="/dashboard" />
          <ImportExportControls
            entityName="Projects"
            dataToExport={projects}
            exportFilename="pdm_projects"
          />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-white border border-sky-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition disabled:opacity-50 shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setActionError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search projects by name or code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {(search || status !== 'ALL' || priority !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-sky-600 hover:text-sky-700 transition underline underline-offset-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <ProjectTableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Failed to load Projects</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An error occurred while communicating with ERPNext.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Projects Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No project records match your current filter criteria or exist in ERPNext.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Create First Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Project Name & ID</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Progress</th>
                    <th className="py-3.5 px-4">Target Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {projects.map((project: Project) => (
                    <motion.tr
                      key={project.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/projects/${encodeURIComponent(project.name)}`}
                          className="group-hover:text-sky-600 transition"
                        >
                          <div className="font-bold text-slate-900 text-sm">
                            {project.project_name || project.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-mono">
                              {project.name}
                            </span>
                            {project.custom_project_category && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-sky-50 text-sky-700 border border-sky-200">
                                {project.custom_project_category}
                              </span>
                            )}
                            {project.custom_product_group && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {project.custom_product_group}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {project.project_type || 'Internal'}
                      </td>

                      <td className="py-3.5 px-4">
                        <ProjectStatusBadge status={project.status} />
                      </td>

                      <td className="py-3.5 px-4">
                        <ProjectPriorityBadge priority={project.priority} />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                            <span>Complete</span>
                            <span className="font-bold text-slate-800">
                              {project.percent_complete || 0}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(project.percent_complete || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {project.expected_end_date ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{project.expected_end_date}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unspecified</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/projects/${encodeURIComponent(project.name)}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                            title="View Project Charter"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setEditingProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit Project"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalRecords={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Dialog Modals */}
      <ProjectFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={createProjectMutation.isPending}
      />

      <ProjectFormDialog
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleEditSubmit}
        initialData={editingProject}
        isLoading={updateProjectMutation.isPending}
      />

      <ProjectDeleteDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteConfirm}
        projectName={deletingProject?.project_name || deletingProject?.name || ''}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
}
