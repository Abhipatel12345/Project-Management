export type TaskStatus = 'Open' | 'Working' | 'Pending Review' | 'Completed' | 'Cancelled' | 'Skipped';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskRASIC {
  responsible?: string;
  accountable?: string;
  support?: string;
  consulted?: string;
  informed?: string;
}

export interface TaskDependency {
  task_id: string;
  subject: string;
  dependency_type?: 'FS' | 'SS' | 'FF' | 'SF';
}

export interface Task {
  name: string; // ERPNext Primary Key / Task ID (e.g. TASK-2026-001)
  subject: string;
  project?: string; // Project ID (e.g. PROJ-001)
  project_name?: string;
  phase?: string; // e.g. "Phase 1: Concept & Planning"
  phase_id?: string; // e.g. "phase-1"
  status: TaskStatus | string;
  priority: TaskPriority | string;
  exp_start_date?: string;
  exp_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  act_start_date?: string;
  act_end_date?: string;
  expected_time?: number; // In hours
  progress?: number; // 0 - 100
  description?: string;
  assigned_to?: string; // User email or employee name
  assigned_employee_name?: string;
  assigned_department?: string;
  assigned_role?: string;
  parent_task?: string;
  depends_on?: string | TaskDependency[];
  company?: string;
  department?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  owner?: string;
  rasic?: TaskRASIC;
  is_overdue?: boolean;
  overdue_days?: number;
  skip_reason?: string;
  skipped_by?: string;
  skipped_on?: string;
  submissions?: TaskSubmission[];
  // Gantt Tab Specific Fields
  wbs?: string;
  function_name?: string;
  role?: string;
  gate?: string;
  duration?: number;
  is_mandatory_pdp?: boolean;
  is_custom?: boolean;
  is_milestone?: boolean;
  is_skipped?: boolean;
  retimed_to?: string;
  target_start_date?: string;
  target_finish_date?: string;
  predecessors?: string;
  // Milestone & Customer Milestone Specific Fields
  is_customer_milestone?: boolean;
  milestone_type?: MilestoneType | string;
  linked_task?: string | null;
  linked_gate?: string;
  is_kgd?: boolean;
  planned_date?: string;
  actual_date?: string;
  reference_documents?: string[];
  // Raw Custom Field Mappings
  custom_wbs?: string;
  custom_phase?: string;
  custom_gate?: string;
  custom_function?: string;
  custom_role?: string;
  custom_rasic?: string;
  custom_is_mandatory_pdp?: number;
  custom_is_custom?: number;
  custom_is_milestone?: number;
  custom_is_skipped?: number;
  custom_skip_reason?: string;
  custom_retimed_to?: string;
  custom_target_start_date?: string;
  custom_target_finish_date?: string;
  custom_predecessors?: string;
  custom_is_customer_milestone?: number;
  custom_milestone_type?: string;
  custom_linked_task?: string;
  custom_linked_gate?: string;
  custom_is_kgd?: number;
  // Task Document Fields (Authoritative ERPNext DocType Fields)
  custom_attach_document?: string | null;
  custom_task_deliverable?: string | null;
  task_assign_document?: string | null;
  task_deliverable?: string | null;
}

export type MilestoneType =
  | 'Customer Milestone'
  | 'Internal Milestone'
  | 'Gate Milestone'
  | 'Manufacturing Milestone'
  | 'PPAP Milestone'
  | 'Other';

export const MILESTONE_TYPES: MilestoneType[] = [
  'Customer Milestone',
  'Internal Milestone',
  'Gate Milestone',
  'Manufacturing Milestone',
  'PPAP Milestone',
  'Other',
];

export interface TaskSummary {
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  avgCompletionRate: number;
}

export interface MemberWorkload {
  employee_name: string;
  user_email: string;
  department: string;
  role: string;
  function_name?: string;
  totalAssigned: number;
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  tasks: Task[];
}

export interface TaskListQueryParams {
  project?: string;
  phase?: string;
  search?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  department?: string;
  role?: string;
  is_overdue?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskListResponse {
  tasks: Task[];
  allTasks?: Task[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: TaskSummary;
}

export interface TaskComment {
  name: string;
  comment: string;
  comment_by: string;
  creation: string;
}

export interface TaskAttachment {
  name: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  creation?: string;
  uploaded_by?: string;
  submission_id?: string;
  document_type?: string;
  document_role?: 'assignment' | 'deliverable' | 'general';
}

export interface TaskSubmissionAttachment {
  file_id: string;
  file_name: string;
  file_size?: number;
  file_url: string;
  download_url: string;
  mime_type?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface TaskSubmission {
  id: string;
  submission_number: number;
  task_id: string;
  project_id?: string;
  task_subject?: string;
  submitted_by_id: string;
  submitted_by_name: string;
  submitted_at: string;
  progress: number;
  comment: string;
  status: 'Submitted' | 'Approved' | 'Changes Requested';
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  attachments: TaskSubmissionAttachment[];
}

export type { TaskRelationship } from './task-dependency.types';
