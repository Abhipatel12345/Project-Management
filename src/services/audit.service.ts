export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role?: string;
  action: string;
  entityType: 'Project' | 'Task' | 'Issue' | 'MaterialRequest' | 'Gate' | 'User' | 'Document';
  entityId: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

const STORAGE_KEY = 'pdm_audit_logs';

function getInitialLogs(): AuditLogEntry[] {
  return [
    {
      id: 'AUD-001',
      timestamp: '2026-02-20T11:00:00.000Z',
      user: 'Robert Sterling (Warehouse Specialist)',
      role: 'Warehouse User',
      action: 'Issued Material',
      entityType: 'MaterialRequest',
      entityId: 'MR-2026-001',
      oldValue: 'RESERVED',
      newValue: 'ISSUED',
      details: '15 units issued of HV Cooling Plate Prototype Housing for PROJ-0001.',
    },
    {
      id: 'AUD-002',
      timestamp: '2026-02-19T14:20:00.000Z',
      user: 'Alex Morgan (Project Manager)',
      role: 'Project Manager',
      action: 'Created Material Request',
      entityType: 'MaterialRequest',
      entityId: 'MR-2026-002',
      oldValue: 'None',
      newValue: 'REQUESTED',
      details: 'Created requisition for 30 units of Radar Radome Lens.',
    },
    {
      id: 'AUD-003',
      timestamp: '2026-02-18T09:00:00.000Z',
      user: 'PMO Director (Admin)',
      role: 'PMO / Administrator',
      action: 'Created Project',
      entityType: 'Project',
      entityId: 'EV-DM-2026',
      oldValue: 'None',
      newValue: 'PROJ-0001',
      details: 'Created EV Door Module Development project & assigned Alex Morgan as PM.',
    },
  ];
}

export const auditService = {
  getLogs(): AuditLogEntry[] {
    if (typeof window === 'undefined') return getInitialLogs();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = getInitialLogs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return getInitialLogs();
    }
  },

  logAction(
    user: string,
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details?: string,
    oldValue?: string,
    newValue?: string,
    role?: string
  ): AuditLogEntry {
    const logs = this.getLogs();
    const newEntry: AuditLogEntry = {
      id: `AUD-${String(logs.length + 1).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      details,
    };

    const updated = [newEntry, ...logs];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newEntry;
  },
};
