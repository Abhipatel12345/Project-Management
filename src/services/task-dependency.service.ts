import api from './api';
import { TaskRelationship, CreateDependencyPayload, TaskDependencyInfo } from '@/types/task-dependency.types';

export const taskDependencyService = {
  /**
   * Fetch all dependencies for a project
   */
  async getProjectDependencies(projectId: string): Promise<TaskRelationship[]> {
    const res = await api.get<{ data: TaskRelationship[] }>(`/api/projects/${projectId}/dependencies`);
    return res.data || [];
  },

  /**
   * Create a new dependency between tasks in a project
   */
  async createDependency(payload: CreateDependencyPayload): Promise<TaskRelationship> {
    const res = await api.post<{ data: TaskRelationship }>(
      `/api/projects/${payload.project}/dependencies`,
      payload
    );
    return res.data;
  },

  /**
   * Delete a dependency
   */
  async deleteDependency(projectId: string, dependencyId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}/dependencies?dependencyId=${dependencyId}`);
  },

  /**
   * Fetch dependency info for a single task
   */
  async getTaskDependencies(taskId: string, projectId?: string): Promise<TaskDependencyInfo> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const res = await api.get<{ data: TaskDependencyInfo }>(`/api/tasks/${taskId}/dependencies${query}`);
    return res.data;
  },
};
