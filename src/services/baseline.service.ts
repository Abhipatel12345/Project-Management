import api from './api';
import {
  ProjectBaseline,
  BaselineTaskSnapshot,
  TaskBaselineComparison,
  VarianceStatus,
  CreateBaselineInput,
} from '@/types/baseline.types';
import { Task } from '@/types/task.types';

const STORAGE_KEY_PREFIX = 'pdm_project_baselines_';

// Helper: parse date to clean YYYY-MM-DD
const cleanDateStr = (val?: string): string => {
  if (!val || val === 'N/A') return '';
  return val.split(' ')[0].split('T')[0].trim();
};

// Helper: calculate difference in days between two date strings (Date B - Date A)
export const calculateDayDiff = (dateStrA?: string, dateStrB?: string): number => {
  const aClean = cleanDateStr(dateStrA);
  const bClean = cleanDateStr(dateStrB);
  if (!aClean || !bClean) return 0;

  try {
    const dA = new Date(aClean);
    const dB = new Date(bClean);
    const diffTime = dB.getTime() - dA.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

// Helper: calculate task duration in days
export const calculateDurationDays = (startStr?: string, endStr?: string): number => {
  const s = cleanDateStr(startStr);
  const e = cleanDateStr(endStr);
  if (!s || !e) return 1;
  const diff = calculateDayDiff(s, e);
  return Math.max(1, diff);
};

// Local storage fallback helper
const getLocalBaselines = (projectId: string): ProjectBaseline[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalBaselines = (projectId: string, list: ProjectBaseline[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(list));
    } catch {
      // fallback
    }
  }
};

export const baselineService = {
  async getProjectBaselines(projectId: string): Promise<ProjectBaseline[]> {
    if (!projectId) return [];
    try {
      const res = await api.get<{ baselines: ProjectBaseline[] }>(
        `/api/projects/${encodeURIComponent(projectId)}/baselines`
      );
      if (res?.baselines) {
        saveLocalBaselines(projectId, res.baselines);
        return res.baselines;
      }
    } catch {
      // API fallback to local cache
    }
    return getLocalBaselines(projectId);
  },

  async createBaseline(input: CreateBaselineInput, currentTasks: Task[]): Promise<ProjectBaseline> {
    const { project_id, baseline_name, description, created_by } = input;
    const taskSnapshots: Partial<BaselineTaskSnapshot>[] = currentTasks.map((t) => ({
      task_id: t.name,
      task_subject: t.subject,
      planned_start_date: cleanDateStr(t.exp_start_date) || new Date().toISOString().split('T')[0],
      planned_end_date: cleanDateStr(t.exp_end_date) || new Date().toISOString().split('T')[0],
      duration: calculateDurationDays(t.exp_start_date, t.exp_end_date),
      assigned_to: t.assigned_to || t.assigned_employee_name,
      priority: String(t.priority || 'Medium'),
      status: String(t.status || 'Open'),
      progress: t.progress || 0,
      parent_task: t.parent_task,
      depends_on: typeof t.depends_on === 'string' ? t.depends_on : undefined,
    }));

    try {
      const res = await api.post<{ baseline: ProjectBaseline }>(
        `/api/projects/${encodeURIComponent(project_id)}/baselines`,
        {
          baseline_name,
          description,
          created_by: created_by || 'Administrator',
          tasks: taskSnapshots,
        }
      );
      if (res?.baseline) {
        const updatedList = await this.getProjectBaselines(project_id);
        saveLocalBaselines(project_id, updatedList);
        return res.baseline;
      }
    } catch {
      // Client-side fallback creation
    }

    // Local fallback creation if backend request fails
    const existing = getLocalBaselines(project_id);
    const nextNum = existing.length > 0 ? Math.max(...existing.map((b) => b.baseline_number)) + 1 : 1;
    const bId = `BL-${project_id}-${String(nextNum).padStart(2, '0')}`;
    const timestamp = new Date().toISOString();
    const snapshotDate = timestamp.split('T')[0];

    const localTasks: BaselineTaskSnapshot[] = taskSnapshots.map((t) => ({
      baseline_id: bId,
      task_id: t.task_id!,
      task_subject: t.task_subject!,
      planned_start_date: t.planned_start_date!,
      planned_end_date: t.planned_end_date!,
      duration: t.duration || 1,
      assigned_to: t.assigned_to,
      priority: t.priority,
      status: t.status,
      progress: t.progress,
      parent_task: t.parent_task,
    }));

    // Archive previous active baselines
    existing.forEach((b) => {
      if (b.status === 'Active') b.status = 'Archived';
    });

    const newLocalBaseline: ProjectBaseline = {
      baseline_id: bId,
      project_id,
      baseline_name,
      baseline_number: nextNum,
      description: description || '',
      created_by: created_by || 'Administrator',
      created_at: timestamp,
      status: 'Active',
      snapshot_date: snapshotDate,
      task_count: localTasks.length,
      tasks: localTasks,
      audit_trail: [
        {
          action: `Created Baseline ${nextNum}`,
          performed_by: created_by || 'Administrator',
          timestamp,
          details: `Captured ${localTasks.length} tasks`,
        },
      ],
    };

    existing.unshift(newLocalBaseline);
    saveLocalBaselines(project_id, existing);
    return newLocalBaseline;
  },

  async activateBaseline(projectId: string, baselineId: string): Promise<void> {
    try {
      await api.post(`/api/projects/${encodeURIComponent(projectId)}/baselines/${encodeURIComponent(baselineId)}/activate`, {});
    } catch {
      // local fallback
    }
    const list = getLocalBaselines(projectId);
    list.forEach((b) => {
      if (b.baseline_id === baselineId) b.status = 'Active';
      else if (b.status === 'Active') b.status = 'Archived';
    });
    saveLocalBaselines(projectId, list);
  },

  async archiveBaseline(projectId: string, baselineId: string): Promise<void> {
    try {
      await api.post(`/api/projects/${encodeURIComponent(projectId)}/baselines/${encodeURIComponent(baselineId)}/archive`, {});
    } catch {
      // local fallback
    }
    const list = getLocalBaselines(projectId);
    list.forEach((b) => {
      if (b.baseline_id === baselineId) b.status = 'Archived';
    });
    saveLocalBaselines(projectId, list);
  },

  async deleteBaseline(projectId: string, baselineId: string): Promise<void> {
    try {
      await api.delete(`/api/projects/${encodeURIComponent(projectId)}/baselines/${encodeURIComponent(baselineId)}`);
    } catch {
      // local fallback
    }
    const list = getLocalBaselines(projectId).filter((b) => b.baseline_id !== baselineId);
    saveLocalBaselines(projectId, list);
  },

  // Calculate comparison metrics for current tasks against a baseline
  compareTasksWithBaseline(currentTasks: Task[], baseline: ProjectBaseline): TaskBaselineComparison[] {
    const baselineTaskMap = new Map<string, BaselineTaskSnapshot>();
    baseline.tasks.forEach((bt) => baselineTaskMap.set(bt.task_id, bt));

    return currentTasks.map((ct) => {
      const bt = baselineTaskMap.get(ct.name);
      const currentStart = cleanDateStr(ct.exp_start_date) || 'N/A';
      const currentEnd = cleanDateStr(ct.exp_end_date) || 'N/A';
      const currentDuration = calculateDurationDays(currentStart, currentEnd);

      if (!bt) {
        return {
          task_id: ct.name,
          task_subject: ct.subject,
          assigned_to: ct.assigned_to || ct.assigned_employee_name,
          priority: String(ct.priority),
          status: String(ct.status),
          current_progress: ct.progress || 0,
          baseline_start: 'N/A',
          baseline_end: 'N/A',
          baseline_duration: 0,
          current_start: currentStart,
          current_end: currentEnd,
          current_duration: currentDuration,
          start_variance: 0,
          end_variance: 0,
          duration_variance: 0,
          variance_status: 'Unscheduled',
        };
      }

      const baselineStart = bt.planned_start_date;
      const baselineEnd = bt.planned_end_date;
      const baselineDuration = bt.duration || calculateDurationDays(baselineStart, baselineEnd);

      const startVariance = calculateDayDiff(baselineStart, currentStart);
      const endVariance = calculateDayDiff(baselineEnd, currentEnd);
      const durationVariance = currentDuration - baselineDuration;

      let varianceStatus: VarianceStatus = 'On Time';
      if (endVariance > 0 || startVariance > 0) {
        varianceStatus = 'Delayed';
      } else if (endVariance < 0 || startVariance < 0) {
        varianceStatus = 'Ahead';
      }

      return {
        task_id: ct.name,
        task_subject: ct.subject,
        assigned_to: ct.assigned_to || ct.assigned_employee_name,
        priority: String(ct.priority),
        status: String(ct.status),
        current_progress: ct.progress || 0,
        baseline_start: baselineStart,
        baseline_end: baselineEnd,
        baseline_duration: baselineDuration,
        current_start: currentStart,
        current_end: currentEnd,
        current_duration: currentDuration,
        start_variance: startVariance,
        end_variance: endVariance,
        duration_variance: durationVariance,
        variance_status: varianceStatus,
      };
    });
  },
};

export default baselineService;
