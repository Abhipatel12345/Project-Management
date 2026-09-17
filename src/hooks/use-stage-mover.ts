import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StageMoverService } from '@/services/stage-mover.service';
import { ProjectStageMoverStatus, PDPStageCode } from '@/types/stage-mover.types';

export const STAGE_MOVER_KEYS = {
  all: ['stage-mover'] as const,
  project: (id: string) => [...STAGE_MOVER_KEYS.all, id] as const,
};

export function useProjectStageMover(
  projectId: string,
  projectName?: string,
  currentPhase?: string
) {
  return useQuery<ProjectStageMoverStatus>({
    queryKey: STAGE_MOVER_KEYS.project(projectId),
    queryFn: () => StageMoverService.getStatus(projectId, projectName, currentPhase),
    enabled: !!projectId,
    staleTime: 1000 * 20, // 20s
  });
}

export function useTriggerStageWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => StageMoverService.triggerWorkflow(projectId),
    onSuccess: (_data: unknown, projectId: string) => {
      queryClient.invalidateQueries({ queryKey: STAGE_MOVER_KEYS.project(projectId) });
      queryClient.invalidateQueries({ queryKey: ['gates'] });
    },
  });
}

export function useAdvanceStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => StageMoverService.advanceStage(projectId),
    onSuccess: (_data: unknown, projectId: string) => {
      queryClient.invalidateQueries({ queryKey: STAGE_MOVER_KEYS.project(projectId) });
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function usePmoOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      targetStage,
      reason,
      isRollback,
    }: {
      projectId: string;
      targetStage: PDPStageCode;
      reason: string;
      isRollback?: boolean;
    }) => StageMoverService.pmoOverride(projectId, targetStage, reason, isRollback),
    onSuccess: (
      _data: unknown,
      variables: {
        projectId: string;
        targetStage: PDPStageCode;
        reason: string;
        isRollback?: boolean;
      }
    ) => {
      queryClient.invalidateQueries({ queryKey: STAGE_MOVER_KEYS.project(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}
