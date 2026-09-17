import { ProjectStageMoverStatus, PDPStageCode, StageMovementHistoryEntry } from '@/types/stage-mover.types';

export class StageMoverService {
  /**
   * Fetch current stage mover status for a project
   */
  static async getStatus(
    projectId: string,
    projectName?: string,
    currentPhase?: string
  ): Promise<ProjectStageMoverStatus> {
    const params = new URLSearchParams();
    if (projectName) params.set('projectName', projectName);
    if (currentPhase) params.set('currentPhase', currentPhase);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/stage-mover${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch stage mover status' }));
      throw new Error(err.error || 'Failed to fetch stage mover status');
    }

    return res.json();
  }

  /**
   * Trigger the Gate Review Approval workflow (notifications to Board Members)
   */
  static async triggerWorkflow(projectId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/stage-mover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trigger_workflow' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to trigger workflow' }));
      throw new Error(err.error || 'Failed to trigger workflow');
    }

    return res.json();
  }

  /**
   * Execute stage movement (advances stage to next in PDP sequence)
   */
  static async advanceStage(
    projectId: string
  ): Promise<{ success: boolean; historyEntry: StageMovementHistoryEntry }> {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/stage-mover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'advance_stage' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to advance stage' }));
      throw new Error(err.error || 'Failed to advance stage');
    }

    return res.json();
  }

  /**
   * PMO Admin Override / Rollback
   */
  static async pmoOverride(
    projectId: string,
    targetStage: PDPStageCode,
    reason: string,
    isRollback = false
  ): Promise<{ success: boolean; entry: StageMovementHistoryEntry }> {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/stage-mover/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStage, reason, isRollback }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to execute PMO override' }));
      throw new Error(err.error || 'Failed to execute PMO override');
    }

    return res.json();
  }
}
