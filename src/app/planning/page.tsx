'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from '@/hooks/use-tasks';
import {
  useProjectBaselines,
  useCreateBaseline,
  useActivateBaseline,
  useArchiveBaseline,
  useDeleteBaseline,
} from '@/hooks/use-baselines';
import { useCreateSkipRequest } from '@/hooks/use-skip-requests';
import { useProjectTeam } from '@/hooks/use-project-team';
import { useToast } from '@/providers/toast-context';
import baselineService from '@/services/baseline.service';
import { ProjectBaseline } from '@/types/baseline.types';
import { TaskFormValues } from '@/lib/validations/task.schema';
import { GanttHeaderSummary } from '@/components/planning/gantt-header-summary';
import { GanttChartView, GanttViewMode } from '@/components/planning/gantt-chart-view';
import { BaselineManagementModal } from '@/components/planning/baselines/baseline-management-modal';
import { CreateBaselineDialog } from '@/components/planning/baselines/create-baseline-dialog';
import { BaselineComparisonTable } from '@/components/planning/baselines/baseline-comparison-table';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TaskSkipDialog } from '@/components/tasks/task-skip-dialog';
import { Task } from '@/types/task.types';
import { Project } from '@/types/project.types';
import { Loader2 } from 'lucide-react';

import { useSearchParams } from 'next/navigation';

export default function PlanningPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const initialProjectParam = searchParams ? searchParams.get('project') : null;

  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectParam || '');

  // Auto-select project when projects load or URL param is present
  React.useEffect(() => {
    if (initialProjectParam) {
      setSelectedProjectId(initialProjectParam);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].name);
    }
  }, [projects, selectedProjectId, initialProjectParam]);

  // Fetch project-isolated tasks
  const {
    data: taskListData,
    isLoading: isLoadingTasks,
    refetch,
  } = useTasks({
    project: selectedProjectId || undefined,
    pageSize: 100,
  });

  const tasks: Task[] = taskListData?.tasks || [];
  const { data: teamMembers = [] } = useProjectTeam(selectedProjectId);

  // Fetch project-isolated baselines
  const { data: baselines = [], refetch: refetchBaselines } = useProjectBaselines(selectedProjectId);
  const createBaselineMutation = useCreateBaseline();
  const activateBaselineMutation = useActivateBaseline();
  const archiveBaselineMutation = useArchiveBaseline();
  const deleteBaselineMutation = useDeleteBaseline();

  // Baseline UI State
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('CURRENT');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isManageBaselinesOpen, setIsManageBaselinesOpen] = useState<boolean>(false);
  const [isCreateBaselineOpen, setIsCreateBaselineOpen] = useState<boolean>(false);

  // Active Baseline
  const activeBaseline = baselines.find((b: ProjectBaseline) => b.status === 'Active') || (baselines.length > 0 ? baselines[0] : null);

  // Selected comparison baseline target
  const targetCompareBaseline = selectedBaselineId !== 'CURRENT'
    ? (baselines.find((b: ProjectBaseline) => b.baseline_id === selectedBaselineId) || activeBaseline)
    : activeBaseline;

  // Compute Task Baseline Comparisons when compare mode or baseline reference is active
  const taskComparisons = React.useMemo(() => {
    if (!targetCompareBaseline || tasks.length === 0) return [];
    return baselineService.compareTasksWithBaseline(tasks, targetCompareBaseline);
  }, [tasks, targetCompareBaseline]);

  // Task Mutations
  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();
  const createSkipRequestMutation = useCreateSkipRequest();

  // Modals state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [skippingTask, setSkippingTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // View Settings
  const [viewMode, setViewMode] = useState<GanttViewMode>('day');
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false);

  // Selected Project Object
  const selectedProject = projects.find((p: Project) => p.name === selectedProjectId) || null;

  // Calculate Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: Task) => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter((t: Task) => t.status === 'Working' || t.status === 'In Progress').length;
  const overdueTasks = tasks.filter((t: Task) => t.is_overdue).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingTasks = tasks.filter(
    (t: Task) => t.exp_start_date && t.exp_start_date >= todayStr && t.status === 'Open'
  ).length;

  const overallProgress =
    totalTasks > 0
      ? Math.round(tasks.reduce((acc: number, t: Task) => acc + (t.progress || 0), 0) / totalTasks)
      : 0;

  // Baseline Handlers
  const handleCreateBaselineSubmit = async (name: string, description: string) => {
    if (!selectedProjectId) return;
    try {
      await createBaselineMutation.mutateAsync({
        input: {
          project_id: selectedProjectId,
          baseline_name: name,
          description,
          created_by: 'Administrator',
        },
        currentTasks: tasks,
      });
      showToast(`Baseline "${name}" created successfully! Captured ${tasks.length} tasks.`, 'success');
      setIsCreateBaselineOpen(false);
      refetchBaselines();
    } catch (err: any) {
      showToast(err.message || 'Failed to create baseline', 'error');
    }
  };

  const handleActivateBaseline = async (bId: string) => {
    try {
      await activateBaselineMutation.mutateAsync({ projectId: selectedProjectId, baselineId: bId });
      showToast(`Baseline set as active!`, 'success');
      setSelectedBaselineId(bId);
      refetchBaselines();
    } catch (err: any) {
      showToast(err.message || 'Failed to activate baseline', 'error');
    }
  };

  const handleArchiveBaseline = async (bId: string) => {
    try {
      await archiveBaselineMutation.mutateAsync({ projectId: selectedProjectId, baselineId: bId });
      showToast(`Baseline archived.`, 'info');
      refetchBaselines();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive baseline', 'error');
    }
  };

  const handleDeleteBaseline = async (bId: string) => {
    try {
      await deleteBaselineMutation.mutateAsync({ projectId: selectedProjectId, baselineId: bId });
      showToast(`Baseline deleted.`, 'success');
      if (selectedBaselineId === bId) setSelectedBaselineId('CURRENT');
      refetchBaselines();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete baseline', 'error');
    }
  };

  // Task Handlers
  const handleEditSubmit = async (values: TaskFormValues) => {
    if (!editingTask) return;
    try {
      await updateTaskMutation.mutateAsync({
        name: editingTask.name,
        data: {
          subject: values.subject,
          project: values.project,
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

  const handleCreateSubmit = async (values: TaskFormValues) => {
    try {
      const newTask = await createTaskMutation.mutateAsync({
        subject: values.subject,
        project: values.project || selectedProjectId,
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
      showToast(`Task ${newTask.name} created successfully in ERPNext!`, 'success');
      setIsCreateDialogOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task in ERPNext', 'error');
    }
  };

  const handleDateChange = async (task: Task, newStart: string, newEnd: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        name: task.name,
        data: {
          exp_start_date: newStart,
          exp_end_date: newEnd,
        },
      });
      showToast(`Dates updated for ${task.name}`, 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task dates', 'error');
    }
  };

  const handleConfirmSkipTask = async (task: Task, reason: string, comment?: string) => {
    try {
      await createSkipRequestMutation.mutateAsync({
        task_id: task.name,
        task_subject: task.subject,
        project_id: selectedProjectId || task.project || 'Global Project',
        skip_reason: reason,
        additional_comment: comment,
      });
      showToast(`Skip request submitted for task ${task.name}. Pending PM approval.`, 'success');
      setSkippingTask(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit skip request', 'error');
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-32 space-x-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
        <span className="text-sm font-bold">Loading Planning & Gantt Module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header & Summary Banner */}
      <GanttHeaderSummary
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id: string) => {
          setSelectedProjectId(id);
          setSelectedBaselineId('CURRENT');
          setIsCompareMode(false);
        }}
        selectedProject={selectedProject}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        inProgressTasks={inProgressTasks}
        overdueTasks={overdueTasks}
        upcomingTasks={upcomingTasks}
        overallProgress={overallProgress}
        onOpenManageBaselines={() => setIsManageBaselinesOpen(true)}
        activeBaselineName={activeBaseline?.baseline_name}
      />

      {/* Main Gantt Timeline View */}
      {isLoadingTasks ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">
            Fetching project tasks from ERPNext...
          </p>
        </div>
      ) : (
        <GanttChartView
          tasks={tasks}
          teamMembers={teamMembers}
          onEditTask={(t: Task) => setEditingTask(t)}
          onViewTask={(t: Task) => setViewingTask(t)}
          onSkipTask={(t: Task) => setSkippingTask(t)}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showCriticalPathOnly={showCriticalPathOnly}
          setShowCriticalPathOnly={setShowCriticalPathOnly}
          baselines={baselines}
          selectedBaselineId={selectedBaselineId}
          onSelectBaselineId={(id) => setSelectedBaselineId(id)}
          onOpenManageBaselines={() => setIsManageBaselinesOpen(true)}
          isCompareMode={isCompareMode}
          onToggleCompareMode={(val) => setIsCompareMode(val !== undefined ? val : !isCompareMode)}
        />
      )}

      {/* Baseline Comparison Table in Compare Mode */}
      {(isCompareMode || selectedBaselineId === 'COMPARE') && targetCompareBaseline && (
        <BaselineComparisonTable
          comparisons={taskComparisons}
          baseline={targetCompareBaseline}
          onCloseCompareMode={() => setIsCompareMode(false)}
        />
      )}

      {/* Baseline Management Modal */}
      {isManageBaselinesOpen && (
        <BaselineManagementModal
          isOpen={isManageBaselinesOpen}
          onClose={() => setIsManageBaselinesOpen(false)}
          baselines={baselines}
          activeBaseline={activeBaseline}
          selectedBaselineId={selectedBaselineId}
          projectName={selectedProject?.project_name || selectedProjectId}
          onOpenCreateDialog={() => setIsCreateBaselineOpen(true)}
          onActivateBaseline={handleActivateBaseline}
          onArchiveBaseline={handleArchiveBaseline}
          onDeleteBaseline={handleDeleteBaseline}
          onSelectCompareBaseline={(id) => {
            setSelectedBaselineId(id);
            setIsCompareMode(true);
          }}
        />
      )}

      {/* Create Baseline Sub-Dialog */}
      {isCreateBaselineOpen && (
        <CreateBaselineDialog
          isOpen={isCreateBaselineOpen}
          onClose={() => setIsCreateBaselineOpen(false)}
          onSubmit={handleCreateBaselineSubmit}
          existingBaselines={baselines}
          currentTasks={tasks}
          projectName={selectedProject?.project_name || selectedProjectId}
        />
      )}

      {/* Edit Task Dialog Modal */}
      {editingTask && (
        <TaskFormDialog
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditSubmit}
          initialData={editingTask}
          defaultProjectId={selectedProjectId}
        />
      )}

      {/* Create Task Dialog Modal */}
      {isCreateDialogOpen && (
        <TaskFormDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={selectedProjectId}
        />
      )}

      {/* Skip Task Dialog Modal */}
      {skippingTask && (
        <TaskSkipDialog
          isOpen={!!skippingTask}
          task={skippingTask}
          onClose={() => setSkippingTask(null)}
          onSubmitSkipRequest={handleConfirmSkipTask}
        />
      )}

      {/* Task Detail Modal with Baseline Schedule & Variance */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onRefresh={refetch}
          onEdit={(t: Task) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
          activeBaseline={targetCompareBaseline}
        />
      )}
    </div>
  );
}
