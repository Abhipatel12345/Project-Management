'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from '@/hooks/use-tasks';
import { useProjectTeam } from '@/hooks/use-project-team';
import { useToast } from '@/providers/toast-context';
import { TaskFormValues } from '@/lib/validations/task.schema';
import { GanttHeaderSummary } from '@/components/planning/gantt-header-summary';
import { GanttChartView, GanttViewMode } from '@/components/planning/gantt-chart-view';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { Task } from '@/types/task.types';
import { Project } from '@/types/project.types';
import { Loader2 } from 'lucide-react';

export default function PlanningPage() {
  const { showToast } = useToast();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Auto-select first project when projects load
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].name);
    }
  }, [projects, selectedProjectId]);

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

  // Task Mutations
  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();

  // Modals state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
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

  // Handlers
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
        onSelectProject={(id: string) => setSelectedProjectId(id)}
        selectedProject={selectedProject}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        inProgressTasks={inProgressTasks}
        overdueTasks={overdueTasks}
        upcomingTasks={upcomingTasks}
        overallProgress={overallProgress}
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
          onDateChange={handleDateChange}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showCriticalPathOnly={showCriticalPathOnly}
          setShowCriticalPathOnly={setShowCriticalPathOnly}
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

      {/* Task Detail Modal */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={(t: Task) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
        />
      )}
    </div>
  );
}
