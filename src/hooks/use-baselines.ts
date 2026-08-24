import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import baselineService from '@/services/baseline.service';
import { CreateBaselineInput, ProjectBaseline } from '@/types/baseline.types';
import { Task } from '@/types/task.types';

export const BASELINE_KEYS = {
  all: ['baselines'] as const,
  project: (projectId: string) => [...BASELINE_KEYS.all, projectId] as const,
};

export function useProjectBaselines(projectId: string) {
  return useQuery({
    queryKey: BASELINE_KEYS.project(projectId),
    queryFn: () => baselineService.getProjectBaselines(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 15,
  });
}

export function useCreateBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { input: CreateBaselineInput; currentTasks: Task[] } | (CreateBaselineInput & { tasks?: Task[] })) => {
      if ('input' in args && 'currentTasks' in args) {
        return baselineService.createBaseline(args.input, args.currentTasks);
      }
      const { tasks, ...input } = args as any;
      return baselineService.createBaseline(input, tasks || []);
    },
    onSuccess: (_: ProjectBaseline, variables: any) => {
      const projectId = variables?.input?.project_id || variables?.project_id;
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: BASELINE_KEYS.project(projectId) });
      }
      queryClient.invalidateQueries({ queryKey: BASELINE_KEYS.all });
    },
  });
}

export function useActivateBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, baselineId }: { projectId: string; baselineId: string }) =>
      baselineService.activateBaseline(projectId, baselineId),
    onSuccess: (_: void, variables: { projectId: string; baselineId: string }) => {
      queryClient.invalidateQueries({ queryKey: BASELINE_KEYS.project(variables.projectId) });
    },
  });
}

export function useArchiveBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, baselineId }: { projectId: string; baselineId: string }) =>
      baselineService.archiveBaseline(projectId, baselineId),
    onSuccess: (_: void, variables: { projectId: string; baselineId: string }) => {
      queryClient.invalidateQueries({ queryKey: BASELINE_KEYS.project(variables.projectId) });
    },
  });
}

export function useDeleteBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, baselineId }: { projectId: string; baselineId: string }) =>
      baselineService.deleteBaseline(projectId, baselineId),
    onSuccess: (_: void, variables: { projectId: string; baselineId: string }) => {
      queryClient.invalidateQueries({ queryKey: BASELINE_KEYS.project(variables.projectId) });
    },
  });
}
