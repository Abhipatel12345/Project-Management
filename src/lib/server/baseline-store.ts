import fs from 'fs';
import path from 'path';
import { ProjectBaseline } from '@/types/baseline.types';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'baselines.json');

const ensureDirectoryExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

export const readBaselinesFile = (): ProjectBaseline[] => {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([]), 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading baselines.json:', err);
    return [];
  }
};

export const writeBaselinesFile = (baselines: ProjectBaseline[]): void => {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(FILE_PATH, JSON.stringify(baselines, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing baselines.json:', err);
  }
};

import {
  createErpDoc,
  updateErpDoc,
  deleteErpDoc,
  fetchErpResource,
  getErpDoc,
} from './erp-client';

export async function fetchBaselinesFromERPNext(projectId: string): Promise<ProjectBaseline[]> {
  try {
    const list = await fetchErpResource<any>('Project Baseline', {
      filters: [['project', '=', projectId]],
      order_by: 'baseline_number desc',
      limit: 100,
    });
    if (!list || list.length === 0) return getBaselinesByProject(projectId);

    const fullBaselines: ProjectBaseline[] = [];
    for (const item of list) {
      try {
        const doc = await getErpDoc<any>('Project Baseline', item.name);
        const taskSnapshots = (doc.tasks || []).map((t: any) => ({
          baseline_id: doc.baseline_name || doc.name,
          task_id: t.task_id || t.name,
          task_subject: t.subject || 'Task',
          planned_start_date: t.start_date || '',
          planned_end_date: t.end_date || '',
          duration: Number(t.duration_days) || 1,
          assigned_to: t.assigned_to,
          priority: t.priority || 'Medium',
          status: t.status || 'Open',
          progress: Number(t.progress) || 0,
          milestone: Boolean(t.is_milestone),
          wbs: t.wbs || '',
        }));

        fullBaselines.push({
          baseline_id: doc.baseline_name || doc.name,
          project_id: doc.project || projectId,
          baseline_name: doc.baseline_name || `Baseline ${doc.baseline_number}`,
          baseline_number: Number(doc.baseline_number) || 1,
          description: doc.description || '',
          created_by: doc.created_by_user || 'Administrator',
          created_at: doc.created_at_date || doc.creation,
          status: doc.status || 'Active',
          snapshot_date: (doc.created_at_date || doc.creation || '').split(' ')[0],
          task_count: taskSnapshots.length,
          tasks: taskSnapshots,
          audit_trail: [
            {
              action: `Loaded from ERPNext (${doc.name})`,
              performed_by: doc.created_by_user || 'Administrator',
              timestamp: doc.creation,
              details: `Snapshot of ${taskSnapshots.length} tasks`,
            },
          ],
        });
      } catch (err: any) {
        console.warn(`[BaselineStore] Failed to hydrate baseline ${item.name}:`, err.message);
      }
    }

    if (fullBaselines.length > 0) {
      return fullBaselines;
    }
  } catch (err: any) {
    console.warn('[BaselineStore] fetchBaselinesFromERPNext failed, using local cache:', err.message);
  }
  return getBaselinesByProject(projectId);
}

export const getBaselinesByProject = (projectId: string): ProjectBaseline[] => {
  const all = readBaselinesFile();
  return all
    .filter((b) => b.project_id === projectId)
    .sort((a, b) => b.baseline_number - a.baseline_number);
};

export const saveBaseline = (newBaseline: ProjectBaseline): ProjectBaseline => {
  const all = readBaselinesFile();
  // If new baseline is Active, deactivate existing active baseline for this project
  if (newBaseline.status === 'Active') {
    all.forEach((b) => {
      if (b.project_id === newBaseline.project_id && b.status === 'Active') {
        b.status = 'Archived';
        if (!b.audit_trail) b.audit_trail = [];
        b.audit_trail.push({
          action: 'Archived due to new Active baseline creation',
          performed_by: newBaseline.created_by,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  const existingIdx = all.findIndex((b) => b.baseline_id === newBaseline.baseline_id);
  if (existingIdx !== -1) {
    all[existingIdx] = newBaseline;
  } else {
    all.push(newBaseline);
  }

  writeBaselinesFile(all);

  // Authoritative ERPNext Sync: insert to Project Baseline and Baseline Task Item
  const payload = {
    baseline_name: newBaseline.baseline_name,
    baseline_number: newBaseline.baseline_number,
    project: newBaseline.project_id,
    project_name: '',
    status: newBaseline.status || 'Active',
    created_by_user: newBaseline.created_by || 'Administrator',
    created_at_date: (newBaseline.created_at || new Date().toISOString()).replace('T', ' ').replace('Z', '').split('.')[0],
    description: newBaseline.description || '',
    tasks: (newBaseline.tasks || []).map((t) => ({
      task_id: t.task_id || 'TASK',
      subject: t.task_subject || 'Untitled Task',
      start_date: t.planned_start_date || null,
      end_date: t.planned_end_date || null,
      duration_days: Number(t.duration) || 1,
      progress: Number(t.progress) || 0,
      status: t.status || 'Open',
      is_milestone: t.milestone ? 1 : 0,
      wbs: (t as any).wbs || '',
    })),
  };

  createErpDoc('Project Baseline', payload).catch((err) => {
    console.warn('[BaselineStore] Failed to save baseline to ERPNext:', err.message);
  });

  return newBaseline;
};

export const activateBaseline = (projectId: string, baselineId: string, performedBy: string = 'Administrator'): ProjectBaseline | null => {
  const all = readBaselinesFile();
  let target: ProjectBaseline | null = null;

  all.forEach((b) => {
    if (b.project_id === projectId) {
      if (b.baseline_id === baselineId) {
        b.status = 'Active';
        if (!b.audit_trail) b.audit_trail = [];
        b.audit_trail.push({
          action: 'Activated baseline',
          performed_by: performedBy,
          timestamp: new Date().toISOString(),
        });
        target = b;
      } else if (b.status === 'Active') {
        b.status = 'Archived';
        if (!b.audit_trail) b.audit_trail = [];
        b.audit_trail.push({
          action: 'Archived due to activation of another baseline',
          performed_by: performedBy,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  if (target) {
    writeBaselinesFile(all);
  }
  return target;
};

export const archiveBaseline = (projectId: string, baselineId: string, performedBy: string = 'Administrator'): ProjectBaseline | null => {
  const all = readBaselinesFile();
  let target: ProjectBaseline | null = null;

  all.forEach((b) => {
    if (b.project_id === projectId && b.baseline_id === baselineId) {
      b.status = 'Archived';
      if (!b.audit_trail) b.audit_trail = [];
      b.audit_trail.push({
        action: 'Archived baseline',
        performed_by: performedBy,
        timestamp: new Date().toISOString(),
      });
      target = b;
    }
  });

  if (target) {
    writeBaselinesFile(all);
  }
  return target;
};

export const deleteBaseline = (projectId: string, baselineId: string): boolean => {
  const all = readBaselinesFile();
  const filtered = all.filter((b) => !(b.project_id === projectId && b.baseline_id === baselineId));
  if (filtered.length !== all.length) {
    writeBaselinesFile(filtered);
    return true;
  }
  return false;
};
