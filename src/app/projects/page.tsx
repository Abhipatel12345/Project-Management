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
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
      await createProjectMutation.mutateAsync(values);
      setActionSuccess(`Project "${values.project_name}" created successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Failed to create project.';
      setActionError(msg);
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
      const msg = err.message || 'Failed to update project.';
      setActionError(msg);
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 mb-1">
            <FolderKanban className="h-4 w-4" />
            <span>MODULE 2: PROJECT CHARTER</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Project Directory</h1>
          <p className="text-xs text-slate-400">
            Manage automotive product programs, charter scopes, and lifecycle progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setActionError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search projects by name or code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-400">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">
                All Statuses
              </option>
              <option value="Open" className="bg-slate-900 text-slate-200">
                Open
              </option>
              <option value="In Progress" className="bg-slate-900 text-slate-200">
                In Progress
              </option>
              <option value="Completed" className="bg-slate-900 text-slate-200">
                Completed
              </option>
              <option value="On Hold" className="bg-slate-900 text-slate-200">
                On Hold
              </option>
              <option value="Cancelled" className="bg-slate-900 text-slate-200">
                Cancelled
              </option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400">Priority:</span>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">
                All Priorities
              </option>
              <option value="Critical" className="bg-slate-900 text-slate-200">
                Critical
              </option>
              <option value="High" className="bg-slate-900 text-slate-200">
                High
              </option>
              <option value="Medium" className="bg-slate-900 text-slate-200">
                Medium
              </option>
              <option value="Low" className="bg-slate-900 text-slate-200">
                Low
              </option>
            </select>
          </div>

          {(search || status !== 'ALL' || priority !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs text-slate-400 hover:text-cyan-400 transition underline underline-offset-2"
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
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">Failed to load Projects</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An error occurred while communicating with ERPNext.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Retry Connection
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">No Projects Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              No project records match your current filter criteria or exist in ERPNext.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium hover:bg-cyan-500/30 transition"
          >
            <Plus className="h-4 w-4" />
            Create First Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Project Name & ID</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Progress</th>
                    <th className="py-3.5 px-4">Target Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs">
                  {projects.map((project: Project) => (
                    <motion.tr
                      key={project.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/projects/${encodeURIComponent(project.name)}`}
                          className="group-hover:text-cyan-400 transition"
                        >
                          <div className="font-semibold text-slate-200 text-sm">
                            {project.project_name || project.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {project.name}
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
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
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Complete</span>
                            <span className="font-medium text-slate-200">
                              {project.percent_complete || 0}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(project.percent_complete || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {project.expected_end_date ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span>{project.expected_end_date}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">Unspecified</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/projects/${encodeURIComponent(project.name)}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition"
                            title="View Project Charter"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setEditingProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 transition"
                            title="Edit Project"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition"
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
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{projects.length}</span> projects
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-medium text-slate-200">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <ProjectFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={createProjectMutation.isPending}
      />

      {/* Edit Dialog */}
      <ProjectFormDialog
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleEditSubmit}
        initialData={editingProject}
        isLoading={updateProjectMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ProjectDeleteDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteConfirm}
        projectName={deletingProject?.project_name || deletingProject?.name}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
}
