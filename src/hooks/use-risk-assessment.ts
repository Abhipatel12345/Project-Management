import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import riskAssessmentService from '@/services/risk-assessment.service';
import { ProjectRiskAssessment } from '@/types/risk.types';

export const RISK_KEYS = {
  all: ['project-risk-assessments'] as const,
  project: (id: string) => [...RISK_KEYS.all, id] as const,
};

export function useProjectRiskAssessment(
  projectId: string,
  projectName?: string,
  currentPhase?: string
) {
  return useQuery<ProjectRiskAssessment>({
    queryKey: RISK_KEYS.project(projectId),
    queryFn: () => riskAssessmentService.getProjectRiskAssessment(projectId, projectName, currentPhase),
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUpdateProjectRiskAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: Partial<ProjectRiskAssessment>;
    }) => riskAssessmentService.updateProjectRiskAssessment(projectId, data),
    onSuccess: (_data: unknown, variables: { projectId: string; data: Partial<ProjectRiskAssessment> }) => {
      queryClient.invalidateQueries({ queryKey: RISK_KEYS.project(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: RISK_KEYS.all });
    },
  });
}
