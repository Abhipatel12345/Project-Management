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
