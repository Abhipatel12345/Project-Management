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
  status: TaskStatus | string;
  priority: TaskPriority | string;
  exp_start_date?: string;
  exp_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
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
}

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
