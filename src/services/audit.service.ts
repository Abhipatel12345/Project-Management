export interface AuditLogEntry {
  id: string;
  timestamp: string;
  project_id?: string;
  user: string;
  role?: string;
  action: string;
  entityType:
    | 'Project'
    | 'Team'
    | 'Task'
    | 'Issue'
    | 'MaterialRequest'
    | 'BOM'
    | 'Gate'
    | 'GateCriterion'
    | 'GateDeliverable'
    | 'DesignReview'
    | 'User'
    | 'Document'
    | string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

const STORAGE_KEY = 'pdm_audit_logs';

export const auditService = {
  /**
   * Fetch project-scoped activity history from server API
   */
  async getProjectActivities(projectId: string, search?: string): Promise<AuditLogEntry[]> {
    if (!projectId) return [];
    try {
      const url = `/api/projects/${encodeURIComponent(projectId)}/activities${
        search ? `?search=${encodeURIComponent(search)}` : ''
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.activities && Array.isArray(data.activities)) {
          return data.activities.map((a: any) => ({
            id: a.id,
            timestamp: a.created_at || a.timestamp,
            project_id: a.project_id,
            user: a.user_name || a.user,
            role: a.role,
            action: a.action,
            entityType: a.entity_type || a.entityType,
            entityId: a.entity_id || a.entityId,
            oldValue: a.old_value || a.oldValue,
            newValue: a.new_value || a.newValue,
            details: a.description || a.details,
          }));
        }
      }
    } catch (err) {
      console.warn('[Audit Service] Failed to fetch server activities, using local store fallback:', err);
    }
    return this.getLogs().filter((l) => !l.project_id || l.project_id === projectId);
  },

  /**
   * Synchronous local fallback
   */
  getLogs(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  /**
   * Log action and send to server API for persistent audit history
   */
  logAction(
    user: string,
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details?: string,
    oldValue?: string,
    newValue?: string,
    role?: string,
    projectId?: string
  ): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      project_id: projectId,
      user,
      role,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      details,
    };

    // Asynchronously send to server endpoint
    if (typeof window !== 'undefined') {
      try {
        const logs = this.getLogs();
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newEntry, ...logs]));

        fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId || 'GLOBAL',
            user_name: user,
            role,
            action,
            entity_type: entityType,
            entity_id: entityId,
            description: details,
            old_value: oldValue,
            new_value: newValue,
          }),
        }).catch((e) => console.warn('[Audit Sync Notice]', e));
      } catch (err) {
        console.warn('[Audit Store Local Error]', err);
      }
    }

    return newEntry;
  },
};

export default auditService;
