'use client';

import React, { useState, useMemo } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks';
import { Task, MemberWorkload, TaskStatus } from '@/types/task.types';
import { TaskSummaryCards } from '@/components/tasks/task-summary-cards';
import { TaskTable } from '@/components/tasks/task-table';
import { TaskKanban } from '@/components/tasks/task-kanban';
import { TaskWorkloadTable } from '@/components/tasks/task-workload-table';
import { TaskWorkloadChart } from '@/components/tasks/task-workload-chart';
import { TaskMemberDetailModal } from '@/components/tasks/task-member-detail-modal';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TaskFormValues } from '@/lib/validations/task.schema';
import {
  Search,
  Plus,
  List,
  Kanban,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckSquare,
} from 'lucide-react';

import { useToast } from '@/providers/toast-context';

interface ProjectTasksTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectTasksTab({ projectId, projectName }: ProjectTasksTabProps) {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberWorkload | null>(null);

  // Fetch Tasks filtered specifically for this Project ID!
  const { data, isLoading, isError, error, refetch } = useTasks({
    project: projectId,
    search: searchQuery,
    status: selectedStatus,
    priority: selectedPriority,
    assigned_to: selectedAssignee,
    is_overdue: showOverdueOnly,
    page: 1,
    pageSize: 100,
  });

  const tasks = data?.tasks || [];
  const summary = data?.summary || {
    totalTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    unassignedTasks: 0,
    avgCompletionRate: 0,
  };

  // Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Compute Member Workload dynamically for current project
  const memberWorkloads = useMemo(() => {
    const map = new Map<string, MemberWorkload>();

    tasks.forEach((t: Task) => {
      const name = t.assigned_employee_name || t.assigned_to || 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          employee_name: name,
          user_email: t.assigned_to && t.assigned_to.includes('@') ? t.assigned_to : '',
          department: t.department || 'Engineering',
          role: t.assigned_role || 'Team Member',
          totalAssigned: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          completionRate: 0,
          tasks: [],
        });
      }
      const mw = map.get(name)!;
      mw.totalAssigned += 1;
      mw.tasks.push(t);

      if (t.status === 'Open') mw.open += 1;
      else if (t.status === 'Working' || t.status === 'In Progress') mw.inProgress += 1;
      else if (t.status === 'Completed') mw.completed += 1;

      if (t.is_overdue) mw.overdue += 1;
    });

    const list = Array.from(map.values());
    list.forEach((mw) => {
      mw.completionRate =
        mw.totalAssigned > 0
          ? Math.round(
              mw.tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / mw.totalAssigned
            )
          : 0;
    });

    return list;
  }, [tasks]);

  // Handlers
  const handleCreateSubmit = async (values: TaskFormValues) => {
    try {
      await createTaskMutation.mutateAsync({
        subject: values.subject,
        project: projectId, // Strictly auto-associate with current Project ID!
        status: values.status,
        priority: values.priority,
        exp_start_date: values.exp_start_date,
        exp_end_date: values.exp_end_date,
        expected_time: values.expected_time,
        progress: values.progress,
        description: values.description,
        assigned_to: values.assigned_to,
        parent_task: values.parent_task,
        depends_on: values.depends_on,
        rasic: {
          responsible: values.rasic_responsible,
          accountable: values.rasic_accountable,
          support: values.rasic_support,
          consulted: values.rasic_consulted,
          informed: values.rasic_informed,
        },
      });
      showToast('Task created successfully in ERPNext!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task in ERPNext', 'error');
    }
  };

  const handleEditSubmit = async (values: TaskFormValues) => {
    if (!editingTask) return;
    try {
      await updateTaskMutation.mutateAsync({
        name: editingTask.name,
        data: {
          subject: values.subject,
          project: projectId,
          status: values.status,
          priority: values.priority,
          exp_start_date: values.exp_start_date,
          exp_end_date: values.exp_end_date,
          expected_time: values.expected_time,
          progress: values.progress,
          description: values.description,
          assigned_to: values.assigned_to,
          parent_task: values.parent_task,
          depends_on: values.depends_on,
          rasic: {
            responsible: values.rasic_responsible,
            accountable: values.rasic_accountable,
            support: values.rasic_support,
            consulted: values.rasic_consulted,
            informed: values.rasic_informed,
          },
        },
      });
      showToast(`Task ${editingTask.name} updated successfully in ERPNext!`, 'success');
      setEditingTask(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task in ERPNext', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    try {
      await deleteTaskMutation.mutateAsync(deletingTask.name);
      showToast(`Task ${deletingTask.name} deleted from ERPNext!`, 'success');
      setDeletingTask(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const handleStatusChange = async (taskName: string, newStatus: TaskStatus) => {
    const progress = newStatus === 'Completed' ? 100 : newStatus === 'Open' ? 0 : 50;
    try {
      await updateTaskMutation.mutateAsync({
        name: taskName,
        data: { status: newStatus, progress },
      });
      showToast(`Task ${taskName} moved to ${newStatus}!`, 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-black text-sky-800 uppercase tracking-wider">
              Project Deliverable Breakdown
            </div>
            <h2 className="text-base font-black text-slate-900">
              Tasks for {projectName} ({projectId})
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh Project Tasks"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Create Task</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <TaskSummaryCards summary={summary} />

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project tasks..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Working">Working / In Progress</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent / Critical</option>
            </select>
          </div>

          {/* Overdue */}
          <div>
            <button
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showOverdueOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span>{showOverdueOnly ? 'Overdue Only' : 'Overdue Filter'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Content */}
      {isLoading ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
          <Loader2 className="h-7 w-7 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading tasks for project {projectId}...</p>
        </div>
      ) : isError ? (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
          <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900">ERPNext Task Error</h3>
          <p className="text-xs text-rose-700">{(error as any)?.message || 'Failed to fetch project tasks.'}</p>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <TaskTable
              tasks={tasks}
              onViewTask={(t) => setViewingTask(t)}
              onEditTask={(t) => setEditingTask(t)}
              onDeleteTask={(t) => setDeletingTask(t)}
            />
          ) : (
            <TaskKanban
              tasks={tasks}
              onViewTask={(t) => setViewingTask(t)}
              onEditTask={(t) => setEditingTask(t)}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* Member Workload & Task Allocation Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            <TaskWorkloadChart workloads={memberWorkloads} />
            <TaskWorkloadTable
              workloads={memberWorkloads}
              onSelectMember={(mw) => setSelectedMember(mw)}
            />
          </div>
        </>
      )}

      {/* Modals */}
      <TaskFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        defaultProjectId={projectId}
        isLoading={createTaskMutation.isPending}
      />

      <TaskFormDialog
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleEditSubmit}
        initialData={editingTask}
        defaultProjectId={projectId}
        isLoading={updateTaskMutation.isPending}
      />

      <TaskDeleteDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteConfirm}
        taskSubject={deletingTask?.subject}
        isLoading={deleteTaskMutation.isPending}
      />

      <TaskDetailModal
        task={viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={(t) => {
          setViewingTask(null);
          setEditingTask(t);
        }}
      />

      <TaskMemberDetailModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onViewTask={(t) => setViewingTask(t)}
      />
    </div>
  );
}
