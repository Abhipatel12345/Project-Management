export type DesignReviewType =
  | 'Concept Review'
  | 'Preliminary Design Review'
  | 'Detailed Design Review'
  | 'Engineering Review'
  | 'Design Validation Review'
  | 'Final Design Review';

export type DesignReviewStatus =
  | 'Planned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type DesignReviewApprovalStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Approved with Conditions'
  | 'Rejected';

export type FindingSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type FindingStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface ReviewFinding {
  id: string;
  description: string;
  severity: FindingSeverity;
  assigned_to: string;
  due_date?: string;
  status: FindingStatus;
  comments?: string;
  created_at?: string;
}

export interface DesignReview {
  name: string; // Review ID e.g. DR-2026-001
  title: string;
  project?: string;
  review_type: DesignReviewType | string;
  review_date?: string;
  reviewer: string; // Review owner / lead
  participants?: string[];
  status: DesignReviewStatus;
  approval_status: DesignReviewApprovalStatus;
  description?: string;
  notes?: string;
  findings: ReviewFinding[];
  creation?: string;
  modified?: string;
  owner?: string;
}

export interface DesignReviewSummary {
  totalReviews: number;
  plannedReviews: number;
  inProgressReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  openFindings: number;
}

export interface DesignReviewListQueryParams {
  project?: string;
  search?: string;
  review_type?: string;
  status?: string;
  approval_status?: string;
  page?: number;
  pageSize?: number;
}

export interface DesignReviewListResponse {
  reviews: DesignReview[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: DesignReviewSummary;
}
