import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { ProjectPhase, STANDARD_PROJECT_PHASES } from '@/constants/phases';

export function useProjectPhases(projectId?: string) {
  return useQuery<ProjectPhase[]>({
    queryKey: ['project-phases', projectId || 'global'],
    queryFn: async () => {
      if (!projectId || projectId === 'ALL') {
        return STANDARD_PROJECT_PHASES;
      }
      try {
        const res = await api.get<{ data?: ProjectPhase[]; phases?: ProjectPhase[] }>(
          `/api/projects/${encodeURIComponent(projectId)}/phases`
        );
        return res.data || res.phases || STANDARD_PROJECT_PHASES;
      } catch {
        return STANDARD_PROJECT_PHASES;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateProjectPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      phaseName,
      description,
    }: {
      projectId: string;
      phaseName: string;
      description?: string;
    }) => {
      const res = await api.post<{ data: ProjectPhase; phase: ProjectPhase }>(
        `/api/projects/${encodeURIComponent(projectId)}/phases`,
        {
          target_project: projectId,
          phase_name: phaseName,
          phase_scope_and_objectives: description || '',
          name: phaseName,
          description: description || '',
        }
      );
      return res.data || res.phase;
    },
    onSuccess: (_data: ProjectPhase, variables: { projectId: string; phaseName: string; description?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-phases', 'global'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
