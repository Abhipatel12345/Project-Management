import { useQuery } from '@tanstack/react-query';
import flawlessLaunchService from '@/services/flawless-launch.service';
import { ProjectFLMData } from '@/types/flawless-launch.types';

export const FLM_KEYS = {
  all: ['project-flm-evaluations'] as const,
  project: (id: string) => [...FLM_KEYS.all, id] as const,
};

export function useProjectFLM(
  projectId: string,
  projectName?: string,
  currentGate?: string
) {
  return useQuery<ProjectFLMData>({
    queryKey: FLM_KEYS.project(projectId),
    queryFn: () => flawlessLaunchService.getProjectFLM(projectId, projectName, currentGate),
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds
  });
}
