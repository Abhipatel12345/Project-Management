export type IssueStatus = 'Open' | 'Replied' | 'On Hold' | 'Resolved' | 'Closed';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type IssueType = 'Technical' | 'Defect' | 'Quality' | 'Safety' | 'General';

export interface Issue {
  name: string; // ERPNext Issue ID (e.g. ISS-2026-00001)
  subject: string;
  project?: string;
  task?: string;
  status: IssueStatus;
  priority: IssuePriority;
  issue_type?: IssueType | string;
  description?: string;
  customer?: string;
  raised_by?: string;
  assigned_to?: string;
  assigned_employee_name?: string;
  creation?: string;
  modified?: string;
  resolution_date?: string;
  resolution_details?: string;
  owner?: string;
}

export interface IssueListQueryParams {
  project?: string;
  status?: string;
  priority?: string;
  issue_type?: string;
  assigned_to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IssueSummary {
  totalIssues: number;
  openIssues: number;
  highPriorityIssues: number;
  urgentIssues: number;
  resolvedIssues: number;
  onHoldIssues: number;
}

export interface IssueListResponse {
  issues: Issue[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: IssueSummary;
}
