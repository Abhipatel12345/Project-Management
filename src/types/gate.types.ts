export type GateType =
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
  | 'Rejected';

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
}

export interface GateDeliverable {
  id: string;
  name: string;
  description?: string;
  responsible_person?: string;
  project?: string;
  due_date?: string;
  status: DeliverableStatus;
  completion_percentage: number;
  is_required: boolean;
  document_reference?: string;
  related_task?: string;
}

export interface GateReviewRecord {
  id: string;
  reviewer: string;
  review_date: string;
  decision: 'Approved' | 'Approved with Conditions' | 'Rejected';
  comments?: string;
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
  actual_date?: string;
  status: GateStatus;
  gate_owner: string;
  approval_status: GateApprovalStatus;
  completion_percentage: number;
  readiness_percentage: number;
  criteria: GateCriterion[];
  deliverables: GateDeliverable[];
  reviews: GateReviewRecord[];
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
