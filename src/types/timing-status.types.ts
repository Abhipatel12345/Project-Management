/**
 * TypeScript definitions for Project Status / Timing Status Chart
 * Directly mapped to ERPNext DocTypes:
 * - `Project Status Timing Chart` (Parent)
 * - `Project Status Timing Line Item` (Child Table)
 */

import { TimingStatusChoice } from '@/config/timing-benchmark.config';

export interface ProjectStatusTimingLineItem {
  name?: string;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  idx?: number;
  category: string;
  pdp_line_item: string;
  reference_code: string;
  status: TimingStatusChoice;
  base_plan_finish_date?: string;
  current_plan_finish_date?: string;
  benchmark_plan_finish_date?: string;
  current_plan_weeks?: number;
  benchmark_weeks?: number;
  week_variance?: number;
  comments?: string;
  // Derived Gantt metadata for UI
  task_id?: string;
  is_synced_from_gantt?: boolean;
}

export interface ProjectStatusTimingChart {
  name?: string;
  project: string;
  product_group?: string;
  program_manager?: string;
  template?: string;
  comments?: string;
  timing_line_items: ProjectStatusTimingLineItem[];
  creation?: string;
  modified?: string;
  modified_by?: string;
  owner?: string;
}

export interface TimingStatusUpdatePayload {
  comments?: string;
  timing_line_items: Array<{
    name?: string;
    reference_code: string;
    status: TimingStatusChoice;
    comments?: string;
  }>;
}

export interface TimingStatusSummaryKPIs {
  totalMilestones: number;
  completedOnTime: number; // 'C'
  completedLate: number;   // 'C Late'
  atRisk: number;          // 'Y'
  critical: number;        // 'R'
  notApplicable: number;   // 'N/A'
}
