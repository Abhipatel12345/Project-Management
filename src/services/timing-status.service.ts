/**
 * Project Status Timing Chart Service
 * Handles API communication, Gantt date synchronization, and Excel/Report export.
 */

import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  ProjectStatusTimingChart,
  TimingStatusUpdatePayload,
} from '@/types/timing-status.types';
import { TIMING_STATUS_CONFIG } from '@/config/timing-benchmark.config';

class TimingStatusService {
  /**
   * Fetch timing status chart for a project
   */
  async getTimingStatus(projectId: string): Promise<ProjectStatusTimingChart> {
    const res = await axios.get<{ data: ProjectStatusTimingChart }>(
      `/api/projects/${encodeURIComponent(projectId)}/timing-status`
    );
    return res.data.data;
  }

  /**
   * Update permitted timing status fields (status & comments)
   */
  async updateTimingStatus(
    projectId: string,
    payload: TimingStatusUpdatePayload
  ): Promise<ProjectStatusTimingChart> {
    const res = await axios.put<{ data: ProjectStatusTimingChart }>(
      `/api/projects/${encodeURIComponent(projectId)}/timing-status`,
      payload
    );
    return res.data.data;
  }

  /**
   * Export timing chart to formatted Microsoft Excel (.xlsx)
   */
  exportToExcel(projectName: string, projectId: string, chart: ProjectStatusTimingChart): void {
    const rows = (chart.timing_line_items || []).map((item, idx) => ({
      '#': idx + 1,
      'Category': item.category,
      'PDP Line Item': item.pdp_line_item,
      'Reference Code': item.reference_code,
      'Status': item.status,
      'Status Label': TIMING_STATUS_CONFIG[item.status]?.label || item.status,
      'Base Plan Finish Date': item.base_plan_finish_date || 'N/A',
      'Current Plan Finish Date': item.current_plan_finish_date || 'N/A',
      'Benchmark Finish Date': item.benchmark_plan_finish_date || 'N/A',
      'Current Plan (Weeks)': item.current_plan_weeks !== undefined ? item.current_plan_weeks : '',
      'Benchmark (Weeks)': item.benchmark_weeks !== undefined ? item.benchmark_weeks : '',
      'Week Variance': item.week_variance !== undefined ? (item.week_variance > 0 ? `+${item.week_variance}` : `${item.week_variance}`) : '',
      'Comments': item.comments || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 4 },
      { wch: 32 },
      { wch: 32 },
      { wch: 16 },
      { wch: 10 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timing Status Chart');

    const filename = `${projectId}_Timing_Status_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  }
}

export const timingStatusService = new TimingStatusService();
