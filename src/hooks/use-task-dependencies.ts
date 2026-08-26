import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskDependencyService } from '@/services/task-dependency.service';
import { CreateDependencyPayload } from '@/types/task-dependency.types';

export function useProjectDependencies(projectId?: string) {
  return useQuery({
    queryKey: ['project-dependencies', projectId],
    queryFn: () => (projectId ? taskDependencyService.getProjectDependencies(projectId) : []),
    enabled: !!projectId,
    staleTime: 1000 * 10,
  });
}

export function useTaskDependencies(taskId?: string, projectId?: string) {
  return useQuery({
    queryKey: ['task-dependencies', taskId, projectId],
    queryFn: () => (taskId ? taskDependencyService.getTaskDependencies(taskId, projectId) : null),
    enabled: !!taskId,
    staleTime: 1000 * 10,
  });
}

export function useCreateDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDependencyPayload) =>
      taskDependencyService.createDependency(payload),
    onSuccess: (_: unknown, variables: CreateDependencyPayload) => {
      queryClient.invalidateQueries({ queryKey: ['project-dependencies', variables.project] });
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, dependencyId }: { projectId: string; dependencyId: string }) =>
      taskDependencyService.deleteDependency(projectId, dependencyId),
    onSuccess: (_: unknown, variables: { projectId: string; dependencyId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['project-dependencies', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
