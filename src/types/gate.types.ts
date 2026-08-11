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

export interface GateDeliverable {
  id: string;
  name: string;
  description?: string;
  responsible_person?: string;
  due_date?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  completion_percentage: number;
  is_required: boolean;
  document_reference?: string;
}

export interface GateReviewSignoff {
  reviewer: string;
  review_date?: string;
  decision: 'Approved' | 'Approved with Conditions' | 'Rejected' | 'Pending';
  comments?: string;
}

export interface Gate {
  name: string; // Gate ID e.g. GATE-2026-001
  gate_name: string;
  project?: string;
  gate_type: GateType | string;
  planned_date?: string;
  actual_date?: string;
  status: GateStatus;
  gate_owner: string;
  approval_status: GateApprovalStatus;
  completion_percentage: number; // Calculated dynamically from deliverables
  readiness_percentage: number; // (Completed Required / Total Required) * 100
  deliverables: GateDeliverable[];
  review_signoff?: GateReviewSignoff;
  description?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

export interface GateSummary {
  totalGates: number;
  upcomingGates: number;
  inProgressGates: number;
  completedGates: number;
  blockedGates: number;
  requiringApprovalGates: number;
}

export interface GateListQueryParams {
  project?: string;
  search?: string;
  gate_type?: string;
  status?: string;
  approval_status?: string;
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
