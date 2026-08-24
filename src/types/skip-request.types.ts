export type SkipRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TaskSkipRequest {
  id: string;
  task_id: string;
  task_subject: string;
  project_id: string;
  requested_by: string;
  requested_by_name?: string;
  requested_at: string;
  skip_reason: string;
  additional_comment?: string;
  status: SkipRequestStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface CreateSkipRequestInput {
  task_id: string;
  task_subject: string;
  project_id: string;
  skip_reason: string;
  additional_comment?: string;
}
