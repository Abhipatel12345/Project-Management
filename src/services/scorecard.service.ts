import api from './api';
import { ProjectScorecard } from '@/types/scorecard.types';

export const scorecardService = {
  async getScorecard(projectId: string): Promise<ProjectScorecard> {
    const res = await api.get<{ scorecard: ProjectScorecard }>(
      `/api/projects/${encodeURIComponent(projectId)}/scorecard`
    );
    return res.scorecard;
  },

  async updateScorecard(
    projectId: string,
    scorecard: ProjectScorecard
  ): Promise<ProjectScorecard> {
    const res = await api.put<{ scorecard: ProjectScorecard }>(
      `/api/projects/${encodeURIComponent(projectId)}/scorecard`,
      scorecard
    );
    return res.scorecard;
  },

  async importExcel(projectId: string, file: File): Promise<ProjectScorecard> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post<{ scorecard: ProjectScorecard }>(
      `/api/projects/${encodeURIComponent(projectId)}/scorecard/import`,
      formData
    );
    return res.scorecard;
  },

  async downloadTemplate(projectId: string): Promise<void> {
    const res = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/scorecard/template`
    );
    if (!res.ok) throw new Error('Failed to download scorecard template');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Imperative_Scorecard_${projectId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
