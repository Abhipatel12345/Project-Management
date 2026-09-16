export type GateType =
  | '1. PL'
  | '2. VC'
  | '3. TKO'
  | '4. VL'
  | '5. CPA'
  | '6. CT'
  | 'Concept & Charter'
  | 'APQP Stage-Gate'
  | 'Design Freeze'
  | 'FMEA & Risk Validation'
  | 'Validation'
  | 'Production Readiness'
  | 'Flawless Launch'
  | 'Final Approval';

export type GateStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Ready for Review'
  | 'Approved'
  | 'Rejected'
  | 'Blocked'
  | 'Completed';

export type GateApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'Approved with Conditions'
  | 'Rejected'
  | 'Pass'
  | 'Pass with Follow up'
  | 'Escalate';

export type CriterionStatus =
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Not Applicable';

export type DeliverableStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Completed';

export interface GateCriterion {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
  status: CriterionStatus;
  responsible_person?: string;
  due_date?: string;
  comments?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface GateDeliverable {
  id: string;
  deliverable_id?: string;
  project_id?: string;
  gate_id?: string;
  name: string;
  title?: string;
  description?: string;
  responsible_person?: string;
  responsible_user_id?: string;
  project?: string;
  due_date?: string;
  status: DeliverableStatus;
  completion_percentage: number;
  is_required: boolean;
  related_task?: string;
  related_task_id?: string;
  related_task_subject?: string;
  document_reference?: string;
  linked_document_id?: string;
  linked_document_name?: string;
  created_by?: string;
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  review_comments?: string;
  approval_status?: 'Not Started' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | string;
  approval_comment?: string;
  rejection_reason?: string;
}

export interface GateReviewRecord {
  id: string;
  reviewer: string;
  review_date: string;
  decision: 'Approved' | 'Approved with Conditions' | 'Rejected' | 'Pass' | 'Pass with Follow up' | 'Escalate';
  comments?: string;
}

export interface GateBoardReviewDecision {
  board_title: string;
  function: string;
  name: string;
  delegation: 'Applicable' | 'Not Applicable' | string;
  gate_decision: 'Pass' | 'Pass with Follow up' | 'Escalate' | 'Pending' | string;
  remarks?: string;
  decision_date?: string;
}

export interface GateReviewSummaryItem {
  gate_name: string; // e.g. '1. PL', '2. VC', etc.
  function?: string;
  chairman: string;
  pdt_recommendation: 'Pass' | 'Pass with Follow up' | 'Escalate' | string;
  board_recommendation: 'Pass' | 'Pass with Follow up' | 'Escalate' | string;
  design_review_date?: string;
  second_review_date?: string;
  second_review_notes?: string;
  third_review_date?: string;
  third_review_notes?: string;
  dr_pass_date?: string;
}

export interface GateActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export interface Gate {
  name: string; // Gate ID e.g. GATE-2026-00001
  gate_name: string;
  project?: string;
  gate_type: GateType | string;
  planned_date?: string;
  target_date?: string;
  actual_date?: string;
  status: GateStatus;
  gate_owner: string;
  gate_owner_id?: string;
  gate_reviewer?: string;
  reviewer_user_id?: string;
  gate_reviewer_user_id?: string;
  custom_gate_reviewer?: string;
  approval_status: GateApprovalStatus;
  completion_percentage: number;
  readiness_percentage: number;
  completed_criteria_count?: number;
  total_criteria_count?: number;
  completed_deliverables_count?: number;
  total_deliverables_count?: number;
  blocking_items_count?: number;
  criteria: GateCriterion[];
  deliverables: GateDeliverable[];
  reviews: GateReviewRecord[];
  board_reviews?: GateBoardReviewDecision[];
  review_summaries?: GateReviewSummaryItem[];
  activity_log: GateActivityLog[];
  description?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

export interface GateSummary {
  totalGates: number;
  notStartedGates: number;
  inProgressGates: number;
  readyForReviewGates: number;
  approvedGates: number;
  blockedGates: number;
  upcomingGates: number;
  completedGates: number;
  requiringApprovalGates: number;
}

export interface GateListQueryParams {
  project?: string;
  search?: string;
  gate_type?: string;
  status?: string;
  approval_status?: string;
  gate_owner?: string;
  page?: number;
  pageSize?: number;
}

export interface GateListResponse {
  gates: Gate[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: GateSummary;
}

