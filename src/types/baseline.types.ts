export type BaselineStatus = 'Active' | 'Archived';

export interface BaselineTaskSnapshot {
  baseline_id: string;
  task_id: string; // ERPNext Task Name (e.g. TASK-2026-001)
  task_subject: string;
  planned_start_date: string; // YYYY-MM-DD
  planned_end_date: string; // YYYY-MM-DD
  duration: number; // in days
  assigned_to?: string;
  priority?: string;
  status?: string;
  progress?: number;
  parent_task?: string;
  depends_on?: string | any;
  milestone?: boolean;
}

export interface ProjectBaseline {
  baseline_id: string;
  project_id: string;
  baseline_name: string;
  baseline_number: number; // 1, 2, 3...
  description?: string;
  created_by: string;
  created_at: string; // ISO date
  status: BaselineStatus;
  snapshot_date: string; // YYYY-MM-DD
  task_count: number;
  tasks: BaselineTaskSnapshot[];
  audit_trail?: {
    action: string;
    performed_by: string;
    timestamp: string;
    details?: string;
  }[];
}

export type VarianceStatus = 'On Time' | 'Delayed' | 'Ahead' | 'Unscheduled';

export interface TaskBaselineComparison {
  task_id: string;
  task_subject: string;
  assigned_to?: string;
  priority?: string;
  status?: string;
  current_progress?: number;
  
  // Baseline Schedule
  baseline_start: string; // YYYY-MM-DD
  baseline_end: string;   // YYYY-MM-DD
  baseline_duration: number; // days

  // Current Schedule
  current_start: string;  // YYYY-MM-DD
  current_end: string;    // YYYY-MM-DD
  current_duration: number; // days

  // Variances (Current - Baseline)
  start_variance: number;   // days (Positive = Delayed, Negative = Ahead, 0 = On Time)
  end_variance: number;     // days
  duration_variance: number;// days

  variance_status: VarianceStatus;
}

export interface CreateBaselineInput {
  project_id: string;
  baseline_name: string;
  description?: string;
  created_by?: string;
}

export interface BaselineSummary {
  totalBaselines: number;
  activeBaseline: ProjectBaseline | null;
  latestBaseline: ProjectBaseline | null;
}
