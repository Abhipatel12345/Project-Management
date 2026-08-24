import fs from 'fs';
import path from 'path';

export interface AuditRecord {
  id: string;
  project_id: string;
  user_id?: string;
  user_name: string;
  role?: string;
  action: string;
  entity_type:
    | 'Project'
    | 'Team'
    | 'Task'
    | 'DesignReview'
    | 'Gate'
    | 'GateCriterion'
    | 'GateDeliverable'
    | 'Document'
    | 'MaterialRequest'
    | 'BOM'
    | 'Issue'
    | string;
  entity_id: string;
  description: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

const memoryAuditLogs: AuditRecord[] = [];

const getAuditFilePath = (): string => {
  return path.join(process.cwd(), '.data', 'audit_logs.json');
};

const getInitialSeedRecords = (): AuditRecord[] => {
  return [
    {
      id: 'AUD-2026-00001',
      project_id: 'PROJ-0043',
      user_id: 'sarahjenkins@gmail.com',
      user_name: 'Sarah Jenkins',
      role: 'Project Manager',
      action: 'Project Created',
      entity_type: 'Project',
      entity_id: 'PROJ-0043',
      description: 'Initialized APQP EV Door Module Development project and setup work breakdown structure.',
      old_value: 'None',
      new_value: 'Open',
      created_at: '2026-08-20T09:00:00.000Z',
    },
    {
      id: 'AUD-2026-00002',
      project_id: 'PROJ-0043',
      user_id: 'sarahjenkins@gmail.com',
      user_name: 'Sarah Jenkins',
      role: 'Project Manager',
      action: 'Team Member Added',
      entity_type: 'Team',
      entity_id: 'EMP-YASH',
      description: 'Assigned Yash as Lead Systems Engineer for latch actuation and mechanical styling.',
      old_value: 'Unassigned',
      new_value: 'Yash (Systems Engineer)',
      created_at: '2026-08-21T10:15:00.000Z',
    },
    {
      id: 'AUD-2026-00003',
      project_id: 'PROJ-0043',
      user_id: 'Administrator',
      user_name: 'Administrator',
      role: 'PMO / Administrator',
      action: 'Gate Created',
      entity_type: 'Gate',
      entity_id: 'GATE-2026-00001',
      description: 'Configured APQP Concept & Charter Stage Gate with compliance checklist.',
      old_value: 'None',
      new_value: 'In Progress',
      created_at: '2026-08-22T14:30:00.000Z',
    },
  ];
};

export const readAuditRecordsFile = (): AuditRecord[] => {
  try {
    const filePath = getAuditFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Audit Store] Failed to read disk file, using memory store:', err);
  }

  if (memoryAuditLogs.length > 0) {
    return memoryAuditLogs;
  }

  const seed = getInitialSeedRecords();
  memoryAuditLogs.push(...seed);
  try {
    const dir = path.dirname(getAuditFilePath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getAuditFilePath(), JSON.stringify(seed, null, 2), 'utf-8');
  } catch {}

  return memoryAuditLogs;
};

export const saveAuditRecord = (entry: Omit<AuditRecord, 'id' | 'created_at'> & { id?: string; created_at?: string }): AuditRecord => {
  const allRecords = readAuditRecordsFile();
  const nextNum = allRecords.length + 1;
  const id = entry.id || `AUD-2026-${String(nextNum).padStart(5, '0')}`;
  const created_at = entry.created_at || new Date().toISOString();

  const record: AuditRecord = {
    id,
    project_id: entry.project_id,
    user_id: entry.user_id,
    user_name: entry.user_name || 'Administrator',
    role: entry.role,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    description: entry.description,
    old_value: entry.old_value,
    new_value: entry.new_value,
    created_at,
  };

  const updated = [record, ...allRecords.filter((r) => r.id !== id)];

  memoryAuditLogs.length = 0;
  memoryAuditLogs.push(...updated);

  try {
    const filePath = getAuditFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Audit Store] Failed to persist audit record to disk:', err);
  }

  return record;
};

export const getAuditRecordsByProject = (projectId: string, search?: string): AuditRecord[] => {
  const all = readAuditRecordsFile();
  const normProject = (projectId || '').toLowerCase().trim();

  let filtered = all.filter((r) => {
    if (!projectId || projectId === 'ALL') return true;
    const p = (r.project_id || '').toLowerCase().trim();
    return p === normProject || p.includes(normProject) || normProject.includes(p);
  });

  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.entity_type.toLowerCase().includes(q) ||
        r.entity_id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.user_name.toLowerCase().includes(q)
    );
  }

  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};
