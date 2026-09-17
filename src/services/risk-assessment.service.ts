import api from './api';
import { ProjectRiskAssessment } from '@/types/risk.types';

class RiskAssessmentService {
  async getProjectRiskAssessment(
    projectId: string,
    projectName?: string,
    currentPhase?: string
  ): Promise<ProjectRiskAssessment> {
    const params = new URLSearchParams();
    if (projectName) params.set('projectName', projectName);
    if (currentPhase) params.set('currentPhase', currentPhase);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<ProjectRiskAssessment>(
      `/api/projects/${encodeURIComponent(projectId)}/risk-assessment${qs}`
    );
    return res;
  }

  async updateProjectRiskAssessment(
    projectId: string,
    data: Partial<ProjectRiskAssessment>
  ): Promise<ProjectRiskAssessment> {
    const res = await api.put<ProjectRiskAssessment>(
      `/api/projects/${encodeURIComponent(projectId)}/risk-assessment`,
      data
    );
    return res;
  }
}

export const riskAssessmentService = new RiskAssessmentService();
export default riskAssessmentService;
