export type ProjectStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export const PROJECT_TYPES = [
  'Internal',
  'External',
  'Other',
] as const;

export const PROJECT_CATEGORIES = [
  'New Product Development',
  'Product Enhancement',
  'Product Modification',
  'Customer Specific Development',
  'Platform Development',
  'Cost Reduction',
  'Quality Improvement',
  'Localization',
  'Engineering Change',
  'Prototype Development',
  'Process Improvement',
  'Maintenance / Sustaining',
  'Other',
] as const;

export const PRODUCT_GROUPS = [
  'Closures',
  'Interior Systems',
  'Cockpit & Instrument Panels',
  'Seating Systems',
  'Overhead Systems',
  'Power Systems',
  'Electronics',
  'Motors & Actuators',
  'Latches & Access Systems',
  'Door Systems',
  'Liftgate Systems',
  'Sunroof / Roof Systems',
  'Window Lift Systems',
  'Other',
] as const;

export interface Project {
  name: string;
  project_name: string;
  status: ProjectStatus | string;
  priority?: ProjectPriority | string;
  project_type?: string;
  custom_project_category?: string;
  custom_product_group?: string;
  custom_product_line?: string;
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
  custom_upload_document?: string;
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
