import api from './api';
import { ProjectFLMData } from '@/types/flawless-launch.types';

class FlawlessLaunchService {
  async getProjectFLM(
    projectId: string,
    projectName?: string,
    currentGate?: string
  ): Promise<ProjectFLMData> {
    const params = new URLSearchParams();
    if (projectName) params.set('projectName', projectName);
    if (currentGate) params.set('currentGate', currentGate);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<ProjectFLMData>(
      `/api/projects/${encodeURIComponent(projectId)}/flawless-launch${qs}`
    );
    return res;
  }
}

export const flawlessLaunchService = new FlawlessLaunchService();
export default flawlessLaunchService;
