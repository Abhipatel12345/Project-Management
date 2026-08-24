import React, { useState } from 'react';
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from '@/hooks/use-tasks';
import { useGates } from '@/hooks/use-gates';
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
import { GanttChartView, GanttViewMode } from '@/components/planning/gantt-chart-view';
import { BaselineManagementModal } from '@/components/planning/baselines/baseline-management-modal';
import { CreateBaselineDialog } from '@/components/planning/baselines/create-baseline-dialog';
import { BaselineComparisonTable } from '@/components/planning/baselines/baseline-comparison-table';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TaskSkipDialog } from '@/components/tasks/task-skip-dialog';
import { Task } from '@/types/task.types';
import { Gate } from '@/types/gate.types';
import { Loader2, Plus, CalendarDays, BookmarkPlus, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface ProjectPlanningTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectPlanningTab({ projectId, projectName }: ProjectPlanningTabProps) {
  const { showToast } = useToast();

  // Fetch project-isolated tasks
  const {
    data: taskListData,
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
    refetch: refetchTasks,
  } = useTasks({
    project: projectId,
    pageSize: 100,
  });

  const tasks: Task[] = taskListData?.tasks || [];
  const { data: teamMembers = [] } = useProjectTeam(projectId);

  // Fetch project-isolated gates
  const { data: gateListData } = useGates({ project: projectId, pageSize: 100 });
  const gates: Gate[] = gateListData?.gates || [];

  // Fetch project-isolated baselines
  const { data: baselines = [], refetch: refetchBaselines } = useProjectBaselines(projectId);
  const createBaselineMutation = useCreateBaseline();
  const createSkipRequestMutation = useCreateSkipRequest();
  const activateBaselineMutation = useActivateBaseline();
  const archiveBaselineMutation = useArchiveBaseline();
  const deleteBaselineMutation = useDeleteBaseline();

  // Baseline UI State
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('CURRENT');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isManageBaselinesOpen, setIsManageBaselinesOpen] = useState<boolean>(false);
  const [isCreateBaselineOpen, setIsCreateBaselineOpen] = useState<boolean>(false);

  // Active Baseline
  const activeBaseline =
    baselines.find((b: ProjectBaseline) => b.status === 'Active') ||
    (baselines.length > 0 ? baselines[0] : null);

  const targetCompareBaseline =
    selectedBaselineId !== 'CURRENT'
      ? baselines.find((b: ProjectBaseline) => b.baseline_id === selectedBaselineId) || activeBaseline
      : activeBaseline;

  // Task Baseline Comparisons
  const taskComparisons = React.useMemo(() => {
    if (!targetCompareBaseline || tasks.length === 0) return [];
    return baselineService.compareTasksWithBaseline(tasks, targetCompareBaseline);
  }, [tasks, targetCompareBaseline]);

  // Task Mutations
  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();

  // Modals state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [skippingTask, setSkippingTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // View Settings
  const [viewMode, setViewMode] = useState<GanttViewMode>('day');
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false);

  // Handlers
  const handleDateChange = async (task: Task, newStart: string, newEnd: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        name: task.name,
        data: {
          exp_start_date: newStart,
          exp_end_date: newEnd,
        },
      });
      showToast(`Task ${task.name} schedule updated in ERPNext!`, 'success');
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task schedule', 'error');
    }
  };

  const handleCreateTaskSubmit = async (values: TaskFormValues) => {
    try {
      await createTaskMutation.mutateAsync({
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
      });
      showToast(`Task created in ERPNext for ${projectId}!`, 'success');
      setIsCreateDialogOpen(false);
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task', 'error');
    }
  };

  const handleEditTaskSubmit = async (values: TaskFormValues) => {
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
      showToast(`Task ${editingTask.name} updated in ERPNext!`, 'success');
      setEditingTask(null);
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleSkipConfirm = async (task: Task, reason: string, comment?: string) => {
    try {
      await createSkipRequestMutation.mutateAsync({
        task_id: task.name,
        task_subject: task.subject,
        project_id: projectId,
        skip_reason: reason,
        additional_comment: comment,
      });
      showToast(`Skip request submitted for task ${task.name}. Pending PM approval.`, 'success');
      setSkippingTask(null);
      refetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit skip request', 'error');
    }
  };

  // Baseline Actions
  const handleCreateBaselineSubmit = async (name: string, description: string) => {
    try {
      await createBaselineMutation.mutateAsync({
        project_id: projectId,
        baseline_name: name,
        description: description,
        tasks,
      });
      showToast(`Baseline "${name}" snapshot created!`, 'success');
      setIsCreateBaselineOpen(false);
      refetchBaselines();
    } catch (err: any) {
      showToast(err.message || 'Failed to create baseline snapshot', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-sky-600" />
            Program Planning & Interactive Gantt Timeline ({projectName})
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage work package schedules, task dependencies, milestone gates, and baseline drift for {projectId}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCreateBaselineOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <BookmarkPlus className="h-4 w-4" />
            <span>Create Baseline</span>
          </button>

          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Gantt Task</span>
          </button>

          <button
            onClick={() => refetchTasks()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Schedule"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingTasks ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Gantt View */}
      {isLoadingTasks ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading Gantt schedule for {projectId} from ERPNext...</p>
        </div>
      ) : isErrorTasks ? (
        <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
          <p className="text-xs font-bold text-rose-600">Failed to load project schedule.</p>
          <button
            onClick={() => refetchTasks()}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <GanttChartView
            tasks={tasks}
            teamMembers={teamMembers}
            onEditTask={(t) => setEditingTask(t)}
            onViewTask={(t) => setViewingTask(t)}
            onDateChange={handleDateChange}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showCriticalPathOnly={showCriticalPathOnly}
            setShowCriticalPathOnly={setShowCriticalPathOnly}
            baselines={baselines}
            selectedBaselineId={selectedBaselineId}
            onSelectBaselineId={setSelectedBaselineId}
            onOpenManageBaselines={() => setIsManageBaselinesOpen(true)}
            isCompareMode={isCompareMode}
            onToggleCompareMode={(val) => setIsCompareMode(val ?? !isCompareMode)}
            onSkipTask={(t) => setSkippingTask(t)}
          />

          {/* Baseline Comparison Mode Table */}
          {isCompareMode && targetCompareBaseline && (
            <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                    Baseline Variance Analysis ({targetCompareBaseline.baseline_name})
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Schedule drift comparison between live ERPNext task dates and baseline snapshot.
                  </p>
                </div>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close Comparison
                </button>
              </div>

              <BaselineComparisonTable
                comparisons={taskComparisons}
                baseline={targetCompareBaseline}
                onCloseCompareMode={() => setIsCompareMode(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <TaskFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTaskSubmit}
        defaultProjectId={projectId}
        isLoading={createTaskMutation.isPending}
      />

      {editingTask && (
        <TaskFormDialog
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditTaskSubmit}
          initialData={editingTask}
          defaultProjectId={projectId}
          isLoading={updateTaskMutation.isPending}
        />
      )}

      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onRefresh={refetchTasks}
          onEdit={(t) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
          activeBaseline={activeBaseline}
        />
      )}

      {skippingTask && (
        <TaskSkipDialog
          isOpen={!!skippingTask}
          task={skippingTask}
          onClose={() => setSkippingTask(null)}
          onSubmitSkipRequest={handleSkipConfirm}
        />
      )}

      {/* Baseline Modals */}
      <CreateBaselineDialog
        isOpen={isCreateBaselineOpen}
        onClose={() => setIsCreateBaselineOpen(false)}
        onSubmit={handleCreateBaselineSubmit}
        existingBaselines={baselines}
        currentTasks={tasks}
        projectName={projectName}
      />

      <BaselineManagementModal
        isOpen={isManageBaselinesOpen}
        onClose={() => setIsManageBaselinesOpen(false)}
        baselines={baselines}
        activeBaseline={activeBaseline}
        selectedBaselineId={selectedBaselineId}
        projectName={projectName}
        onOpenCreateDialog={() => {
          setIsManageBaselinesOpen(false);
          setIsCreateBaselineOpen(true);
        }}
        onActivateBaseline={async (bId: string) => {
          await activateBaselineMutation.mutateAsync(bId);
          showToast('Baseline activated!', 'success');
          refetchBaselines();
        }}
        onArchiveBaseline={async (bId: string) => {
          await archiveBaselineMutation.mutateAsync(bId);
          showToast('Baseline archived!', 'info');
          refetchBaselines();
        }}
        onDeleteBaseline={async (bId: string) => {
          await deleteBaselineMutation.mutateAsync(bId);
          showToast('Baseline deleted!', 'success');
          refetchBaselines();
        }}
        onSelectCompareBaseline={(bId: string) => {
          setSelectedBaselineId(bId);
          setIsCompareMode(true);
          setIsManageBaselinesOpen(false);
        }}
      />
    </div>
  );
}
