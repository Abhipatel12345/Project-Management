import api from './api';
import { TaskSkipRequest, CreateSkipRequestInput } from '@/types/skip-request.types';

export const skipRequestService = {
  /**
   * Fetch all skip requests for a project or global
   */
  async getSkipRequests(projectId?: string): Promise<TaskSkipRequest[]> {
    try {
      const url = projectId && projectId !== 'ALL'
        ? `/api/projects/${encodeURIComponent(projectId)}/skip-requests`
        : '/api/skip-requests';

      const res = await api.get<{ success: boolean; requests: TaskSkipRequest[] }>(url);
      return res?.requests || [];
    } catch (err) {
      console.warn('[Skip Request Service Warning] Failed to fetch skip requests:', err);
      return [];
    }
  },

  /**
   * Submit a new skip request (Team Member)
   */
  async createSkipRequest(input: CreateSkipRequestInput): Promise<TaskSkipRequest> {
    const url = `/api/projects/${encodeURIComponent(input.project_id)}/skip-requests`;
    const res = await api.post<{ success: boolean; request: TaskSkipRequest }>(url, input);
    return res.request;
  },

  /**
   * Approve a skip request (Project Manager)
   */
  async approveSkipRequest(projectId: string, requestId: string): Promise<TaskSkipRequest> {
    const url = `/api/projects/${encodeURIComponent(projectId)}/skip-requests/${encodeURIComponent(requestId)}/approve`;
    const res = await api.post<{ success: boolean; request: TaskSkipRequest }>(url);
    return res.request;
  },

  /**
   * Reject a skip request (Project Manager)
   */
  async rejectSkipRequest(projectId: string, requestId: string, rejectionReason: string): Promise<TaskSkipRequest> {
    const url = `/api/projects/${encodeURIComponent(projectId)}/skip-requests/${encodeURIComponent(requestId)}/reject`;
    const res = await api.post<{ success: boolean; request: TaskSkipRequest }>(url, {
      rejection_reason: rejectionReason,
    });
    return res.request;
  },
};

export default skipRequestService;
