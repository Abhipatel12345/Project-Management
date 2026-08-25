import fs from 'fs';
import path from 'path';
import { TaskRASIC } from '@/types/task.types';
import { PDMUserSession } from '@/types/auth.types';
import { saveAuditRecord } from './audit-store';

const DATA_DIR = path.join(process.cwd(), '.data');
const RASIC_FILE_PATH = path.join(DATA_DIR, 'task_rasic_matrix.json');

export interface StoredTaskRASIC {
  task_id: string;
  responsible?: string;
  accountable?: string;
  support?: string;
  consulted?: string;
  informed?: string;
  modified_at?: string;
  modified_by?: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadAllTaskRasic(): Record<string, StoredTaskRASIC> {
  ensureDataDir();
  if (!fs.existsSync(RASIC_FILE_PATH)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(RASIC_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[RasicStore Error] Failed to read RASIC file:', err);
    return {};
  }
}

export function saveAllTaskRasic(data: Record<string, StoredTaskRASIC>) {
  ensureDataDir();
  try {
    fs.writeFileSync(RASIC_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[RasicStore Error] Failed to write RASIC file:', err);
  }
}

export function getTaskRasic(taskId: string): StoredTaskRASIC | null {
  if (!taskId) return null;
  const all = loadAllTaskRasic();
  return all[taskId] || null;
}

export function saveTaskRasic(
  taskId: string,
  rasicData: Partial<TaskRASIC> | null | undefined,
  session?: PDMUserSession | null
): StoredTaskRASIC | null {
  if (!taskId) return null;
  if (!rasicData || !Object.values(rasicData).some(Boolean)) {
    return null;
  }

  const all = loadAllTaskRasic();
  const existing = all[taskId] || { task_id: taskId };

  const updated: StoredTaskRASIC = {
    ...existing,
    task_id: taskId,
    responsible: rasicData.responsible ?? existing.responsible ?? '',
    accountable: rasicData.accountable ?? existing.accountable ?? '',
    support: rasicData.support ?? existing.support ?? '',
    consulted: rasicData.consulted ?? existing.consulted ?? '',
    informed: rasicData.informed ?? existing.informed ?? '',
    modified_at: new Date().toISOString(),
    modified_by: session?.fullName || session?.email || session?.username || 'System',
  };

  all[taskId] = updated;
  saveAllTaskRasic(all);

  if (session) {
    saveAuditRecord({
      project_id: 'Global',
      action: 'TASK_RASIC_UPDATED',
      entity_type: 'Task',
      entity_id: taskId,
      user_id: session.email || session.username,
      user_name: session.fullName || session.username,
      description: `Updated RASIC Matrix for Task ${taskId} (R: ${updated.responsible || 'None'}, A: ${updated.accountable || 'None'})`,
    });
  }

  return updated;
}

export function deleteTaskRasic(taskId: string) {
  if (!taskId) return;
  const all = loadAllTaskRasic();
  if (all[taskId]) {
    delete all[taskId];
    saveAllTaskRasic(all);
  }
}
