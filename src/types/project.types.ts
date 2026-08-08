export type ProjectStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Project {
  name: string;
  project_name: string;
  status: ProjectStatus | string;
  priority?: ProjectPriority | string;
  project_type?: string;
  percent_complete?: number;
  expected_start_date?: string;
  expected_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  estimated_cost?: number;
  estimated_costing?: number;
  total_costing_amount?: number;
  company?: string;
  department?: string;
  notes?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  modified_by?: string;
}

export interface ProjectListQueryParams {
  search?: string;
  status?: string;
  priority?: string;
  project_type?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectListResponse {
  projects: Project[];
  totalCount: number;
  page: number;
  pageSize: number;
}
