export type PDPStageCode = 'PL' | 'VC' | 'TKO' | 'VL' | 'CPA' | 'CT';

export const PDP_STAGE_ORDER: PDPStageCode[] = ['PL', 'VC', 'TKO', 'VL', 'CPA', 'CT'];

export interface StageMovementHistoryEntry {
  id: string;
  project_id: string;
  from_stage: PDPStageCode;
  to_stage: PDPStageCode;
  moved_at: string;
  moved_by: string;
  trigger_type: 'PD_APPROVAL' | 'PMO_OVERRIDE' | 'PMO_ROLLBACK';
  pd_decision?: 'Pass' | 'Pass with Follow-up' | 'Escalate';
  reason?: string;
  gate_name?: string;
}

export interface ProjectStageMoverStatus {
  project_id: string;
  project_name: string;
  current_stage: PDPStageCode;
  next_stage: PDPStageCode | null;
  can_move: boolean;
  block_reason?: string;
  is_locked: boolean;
  approval_workflow_triggered: boolean;
  approval_workflow_triggered_at?: string;
  platform_director_decision: 'Pass' | 'Pass with Follow-up' | 'Escalate' | 'Pending';
  platform_director_name?: string;
  board_decisions_summary: {
    total: number;
    pass: number;
    pass_with_followup: number;
    escalate: number;
    pending: number;
  };
  history: StageMovementHistoryEntry[];
  current_gate?: any;
}
