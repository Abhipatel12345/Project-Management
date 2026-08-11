import api from './api';
import {
  Issue,
  IssueListQueryParams,
  IssueListResponse,
  IssueSummary,
  IssueStatus,
  IssuePriority,
} from '@/types/issue.types';

const ISSUE_FIELDS = [
  'name',
  'subject',
  'project',
  'status',
  'priority',
  'issue_type',
  'description',
  'customer',
  'raised_by',
  'owner',
  'creation',
  'modified',
  '_assign',
];

const ERPNEXT_ALLOWED_ISSUE_FIELDS = [
  'subject',
  'project',
  // 'task', // removed as not permitted by ERPNext
  'status',
  'priority',
  'issue_type',
  'description',
  'customer',
  'raised_by',
];

const mapStatusToERPNext = (status?: string): IssueStatus => {
  if (!status) return 'Open';
  const s = status.trim();
  if (s.includes('Replied')) return 'Replied';
  if (s.includes('Hold')) return 'On Hold';
  if (s.includes('Resolved')) return 'Resolved';
  if (s.includes('Closed')) return 'Closed';
  return 'Open';
};

const mapPriorityToERPNext = (priority?: string): IssuePriority => {
  if (!priority) return 'Medium';
  const p = priority.trim();
  if (p.includes('Urgent') || p.includes('Critical')) return 'Urgent';
  if (p.includes('High')) return 'High';
  if (p.includes('Low')) return 'Low';
  return 'Medium';
};

const normalizeIssue = (item: any): Issue => {
  let assignedTo = item.assigned_to || item.owner || 'Unassigned';
  if (item._assign) {
    try {
      const arr = typeof item._assign === 'string' ? JSON.parse(item._assign) : item._assign;
      if (Array.isArray(arr) && arr.length > 0) {
        assignedTo = arr[0];
      }
    } catch {
      // fallback
    }
  }

  const cleanCreation = item.creation ? item.creation.split(' ')[0] : undefined;
  const cleanResolution = item.resolution_date ? item.resolution_date.split(' ')[0] : undefined;

  return {
    name: item.name,
    subject: item.subject || 'Untitled Issue',
    project: item.project || '',
    task: item.task || '',
    status: mapStatusToERPNext(item.status),
    priority: mapPriorityToERPNext(item.priority),
    issue_type: item.issue_type || 'Technical',
    description: item.description || '',
    customer: item.customer || '',
    raised_by: item.raised_by || item.owner || '',
    assigned_to: assignedTo,
    creation: cleanCreation,
    modified: item.modified,
    resolution_date: cleanResolution,
    owner: item.owner || '',
  };
};

const cleanPayload = (data: Partial<Issue>): Record<string, any> => {
  const payload: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (ERPNEXT_ALLOWED_ISSUE_FIELDS.includes(key)) {
      if (value !== '' && value !== null && value !== undefined) {
        if (key === 'status') {
          payload.status = mapStatusToERPNext(String(value));
        } else if (key === 'priority') {
          payload.priority = mapPriorityToERPNext(String(value));
        } else if (key === 'raised_by') {
          if (String(value).includes('@')) {
            payload.raised_by = value;
          }
        } else {
          payload[key] = value;
        }
      }
    }
  }

  return payload;
};

export const issueService = {
  /**
   * Get list of issues from ERPNext
   */
  async getIssues(params: IssueListQueryParams = {}): Promise<IssueListResponse> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const limitStart = (page - 1) * pageSize;
    const sortBy = params.sortBy || 'modified';
    const sortOrder = params.sortOrder || 'desc';

    const filters: (string | number)[][] = [];

    if (params.project && params.project !== 'ALL') {
      filters.push(['project', '=', params.project]);
    }

    if (params.status && params.status !== 'ALL') {
      filters.push(['status', '=', params.status]);
    }

    if (params.priority && params.priority !== 'ALL') {
      filters.push(['priority', '=', params.priority]);
    }

    if (params.issue_type && params.issue_type !== 'ALL') {
      filters.push(['issue_type', '=', params.issue_type]);
    }

    if (params.search && params.search.trim() !== '') {
      filters.push(['subject', 'like', `%${params.search.trim()}%`]);
    }

    const queryParts: string[] = [
      `fields=${encodeURIComponent(JSON.stringify(ISSUE_FIELDS))}`,
      `limit_start=${limitStart}`,
      `limit_page_length=${pageSize}`,
      `order_by=${encodeURIComponent(`${sortBy} ${sortOrder}`)}`,
    ];

    if (filters.length > 0) {
      queryParts.push(`filters=${encodeURIComponent(JSON.stringify(filters))}`);
    }

    const url = `/api/resource/Issue?${queryParts.join('&')}`;

    try {
      const response = await api.get<{ data: any[] }>(url);
      const rawIssues = response.data || [];
      let issues = rawIssues.map(normalizeIssue);

      if (params.assigned_to && params.assigned_to !== 'ALL') {
        issues = issues.filter(
          (i) =>
            i.assigned_to?.toLowerCase().includes(params.assigned_to!.toLowerCase()) ||
            i.owner?.toLowerCase().includes(params.assigned_to!.toLowerCase())
        );
      }

      const summary: IssueSummary = {
        totalIssues: issues.length,
        openIssues: issues.filter((i) => i.status === 'Open' || i.status === 'Replied').length,
        highPriorityIssues: issues.filter((i) => i.priority === 'High').length,
        urgentIssues: issues.filter((i) => i.priority === 'Urgent').length,
        resolvedIssues: issues.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length,
        onHoldIssues: issues.filter((i) => i.status === 'On Hold').length,
      };

      return {
        issues,
        totalCount: issues.length,
        page,
        pageSize,
        summary,
      };
    } catch (error: any) {
      console.warn('[ERPNext Issue Service Warning] Fallback for issue list:', error);
      return {
        issues: [],
        totalCount: 0,
        page,
        pageSize,
        summary: {
          totalIssues: 0,
          openIssues: 0,
          highPriorityIssues: 0,
          urgentIssues: 0,
          resolvedIssues: 0,
          onHoldIssues: 0,
        },
      };
    }
  },

  /**
   * Get single issue by Name / ID
   */
  async getIssueByName(name: string): Promise<Issue> {
    try {
      const response = await api.get<{ data: any }>(
        `/api/resource/Issue/${encodeURIComponent(name)}`
      );
      return normalizeIssue(response.data);
    } catch (error: any) {
      console.error(`[ERPNext Issue Service Error] Failed to fetch issue ${name}:`, error);
      throw error;
    }
  },

  /**
   * Create issue in ERPNext
   */
  async createIssue(data: Partial<Issue>): Promise<Issue> {
    let createdDoc: any = null;

    try {
      const payload = cleanPayload(data);
      const response = await api.post<{ data: any }>('/api/resource/Issue', payload);
      createdDoc = response.data;
    } catch (primaryErr: any) {
      console.warn('[ERPNext Issue Service Warning] Primary issue creation failed, trying core payload:', primaryErr);
      // Fallback: Retry with minimal core fields if optional Link fields cause validation errors
      const fallbackPayload: Record<string, any> = {
        subject: data.subject || 'Untitled Issue',
        status: mapStatusToERPNext(data.status),
        priority: mapPriorityToERPNext(data.priority),
      };
      if (data.project) fallbackPayload.project = data.project;
      if (data.description) fallbackPayload.description = data.description;

      const response = await api.post<{ data: any }>('/api/resource/Issue', fallbackPayload);
      createdDoc = response.data;
    }

    const newIssue = normalizeIssue(createdDoc);

    if (data.assigned_to && data.assigned_to !== 'Unassigned' && data.assigned_to.includes('@')) {
      try {
        await api.post('/api/method/frappe.desk.form.assign_to.add', {
          doctype: 'Issue',
          name: newIssue.name,
          assign_to: JSON.stringify([data.assigned_to]),
        });
      } catch {
        // non-blocking assignment
      }
    }

    return newIssue;
  },

  /**
   * Update issue in ERPNext
   */
  async updateIssue(name: string, data: Partial<Issue>): Promise<Issue> {
    const payload = cleanPayload(data);

    try {
      // Primary Attempt: Standard REST Resource PUT
      const response = await api.put<{ data: any }>(
        `/api/resource/Issue/${encodeURIComponent(name)}`,
        payload
      );

      if (data.assigned_to && data.assigned_to !== 'Unassigned' && data.assigned_to.includes('@')) {
        try {
          await api.post('/api/method/frappe.desk.form.assign_to.add', {
            doctype: 'Issue',
            name: name,
            assign_to: JSON.stringify([data.assigned_to]),
          });
        } catch {
          // non-blocking
        }
      }

      return normalizeIssue(response.data);
    } catch {
      try {
        // Secondary Attempt: frappe.client.set_value RPC Endpoint
        const setValRes = await api.post<{ message: any }>(
          '/api/method/frappe.client.set_value',
          {
            doctype: 'Issue',
            name: name,
            fieldname: payload,
          }
        );

        if (data.assigned_to && data.assigned_to !== 'Unassigned' && data.assigned_to.includes('@')) {
          try {
            await api.post('/api/method/frappe.desk.form.assign_to.add', {
              doctype: 'Issue',
              name: name,
              assign_to: JSON.stringify([data.assigned_to]),
            });
          } catch {
            // non-blocking
          }
        }

        return normalizeIssue(setValRes.message || { name, ...payload });
      } catch (error: any) {
        console.error(`[ERPNext Issue Service Error] Failed to update issue ${name}:`, error);
        throw error;
      }
    }
  },

  /**
   * Delete issue in ERPNext
   */
  async deleteIssue(name: string): Promise<void> {
    try {
      await api.delete(`/api/resource/Issue/${encodeURIComponent(name)}`);
    } catch (error: any) {
      console.error(`[ERPNext Issue Service Error] Failed to delete issue ${name}:`, error);
      throw error;
    }
  },
};

export default issueService;
