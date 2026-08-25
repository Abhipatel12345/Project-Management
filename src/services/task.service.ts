import api from './api';
import {
  Task,
  TaskListQueryParams,
  TaskListResponse,
  TaskSummary,
  TaskComment,
  TaskAttachment,
  TaskSubmission,
  TaskSubmissionAttachment,
} from '@/types/task.types';

const TASK_FIELDS = [
  'name',
  'subject',
  'project',
  'status',
  'priority',
  'exp_start_date',
  'exp_end_date',
  'act_start_date',
  'act_end_date',
  'expected_time',
  'progress',
  'description',
  'parent_task',
  'depends_on',
  'company',
  'department',
  'creation',
  'modified',
  'modified_by',
  'owner',
  '_assign',
];

const todayStr = new Date().toISOString().split('T')[0];

export const resolveUserDisplayName = (userStr: string | null | undefined): string => {
  if (!userStr || userStr === 'Unassigned' || userStr === 'none') return 'Unassigned';
  const clean = userStr.trim();
  const lower = clean.toLowerCase();

  if (lower === 'teammember@netlink.com' || lower === 'teammember' || lower.includes('yash')) return 'Yash';
  if (lower === 'sarahjenkins@gmail.com' || lower.includes('sarah.jenkins') || lower.includes('sarahjenkins') || lower === 'sarah') return 'Sarah Jenkins';
  if (lower === 'gatereviewer@netlink.com' || lower.includes('gatereviewer') || lower === 'reviewer') return 'Reviewer';
  if (lower === 'patilabhay717@gmail.com') return 'Abhay Patil';
  if (lower === 'aditya@netlink.com') return 'Aditya';
  if (lower === 'admin@example.com' || lower === 'administrator' || lower === 'admin') return 'Administrator';
  if (lower.includes('john')) return 'John';
  if (lower.includes('quality')) return 'Quality Lead';

  if (clean.includes('@')) {
    const prefix = clean.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return clean;
};

export const resolveUserEmail = (userStr: string | null | undefined): string | undefined => {
  if (!userStr || userStr === 'Unassigned') return undefined;
  const clean = userStr.trim();
  const lower = clean.toLowerCase();

  if (clean.includes('@')) return clean;
  if (lower.includes('yash') || lower === 'teammember') return 'teammember@netlink.com';
  if (lower.includes('sarah') || lower === 'projectmanager') return 'sarahjenkins@gmail.com';
  if (lower.includes('reviewer') || lower === 'gatereviewer') return 'gatereviewer@netlink.com';
  if (lower === 'administrator' || lower === 'admin') return 'admin@example.com';

  return undefined;
};

const calculateOverdue = (expEndDate?: string, status?: string): { is_overdue: boolean; overdue_days: number } => {
  if (!expEndDate || status === 'Completed' || status === 'Cancelled') {
    return { is_overdue: false, overdue_days: 0 };
  }
  const due = new Date(expEndDate);
  const now = new Date(todayStr);
  if (due < now) {
    const diffTime = Math.abs(now.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { is_overdue: true, overdue_days: diffDays };
  }
  return { is_overdue: false, overdue_days: 0 };
};

const ERPNEXT_ALLOWED_TASK_FIELDS = [
  'subject',
  'project',
  'status',
  'priority',
  'exp_start_date',
  'exp_end_date',
  'expected_time',
  'progress',
  'description',
];

const formatDateForERPNext = (val: any): string | undefined => {
  if (!val || typeof val !== 'string') return undefined;
  const str = val.trim();
  if (!str || str === 'N/A') return undefined;

  // Extract clean YYYY-MM-DD from "2026-08-09 00:00:00" or "2026-08-09T00:00:00Z"
  const cleanDate = str.split(' ')[0].split('T')[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }
  return undefined;
};

const normalizeTask = (t: any): Task => {
  const cleanExpStart = formatDateForERPNext(t.exp_start_date) || '';
  const cleanExpEnd = formatDateForERPNext(t.exp_end_date) || '';
  const { is_overdue, overdue_days } = calculateOverdue(cleanExpEnd, t.status);
  
  // Extract assigned user from _assign if present
  let assignedEmail = '';
  let assignedName = '';

  if (t._assign) {
    try {
      const arr = typeof t._assign === 'string' ? JSON.parse(t._assign) : t._assign;
      if (Array.isArray(arr) && arr.length > 0 && arr[0]) {
        assignedEmail = arr[0];
        assignedName = resolveUserDisplayName(arr[0]);
      }
    } catch {
      // fallback
    }
  }

  if (!assignedEmail && t.assigned_to && t.assigned_to !== 'Unassigned' && t.assigned_to !== 'Administrator') {
    assignedEmail = resolveUserEmail(t.assigned_to) || t.assigned_to;
    assignedName = resolveUserDisplayName(t.assigned_to);
  }

  // Parse RASIC and Skip Reason from description metadata block if present
  let rasic = t.rasic;
  let skipReason = t.skip_reason;
  let cleanDescription = t.description || '';

  if (t.description && t.description.includes('<!-- RASIC:')) {
    try {
      const match = t.description.match(/<!-- RASIC: (.*?) -->/);
      if (match && match[1]) {
        rasic = JSON.parse(match[1]);
        cleanDescription = cleanDescription.replace(/<!-- RASIC: .*? -->/, '').trim();
      }
    } catch {
      // fallback
    }
  }

  if (t.description && t.description.includes('<!-- SKIP_REASON:')) {
    try {
      const match = t.description.match(/<!-- SKIP_REASON: (.*?) -->/);
      if (match && match[1]) {
        skipReason = match[1];
        cleanDescription = cleanDescription.replace(/<!-- SKIP_REASON: .*? -->/, '').trim();
      }
    } catch {
      // fallback
    }
  }

  const finalAssignedTo = assignedEmail || 'Unassigned';
  const finalAssignedName = assignedName || (assignedEmail ? resolveUserDisplayName(assignedEmail) : 'Unassigned');

  return {
    ...t,
    exp_start_date: cleanExpStart,
    exp_end_date: cleanExpEnd,
    description: cleanDescription,
    actual_start_date: t.act_start_date || cleanExpStart,
    actual_end_date: t.act_end_date || cleanExpEnd,
    status: t.status || 'Open',
    priority: t.priority || 'Medium',
    progress: typeof t.progress === 'number' ? t.progress : t.status === 'Completed' ? 100 : 0,
    assigned_to: finalAssignedTo,
    assigned_employee_name: finalAssignedName,
    rasic,
    skip_reason: skipReason,
    submissions: t.submissions || [],
    is_overdue,
    overdue_days,
  };
};

const mapStatusToERPNext = (status?: string): string => {
  if (!status) return 'Open';
  const s = status.trim();
  if (s.includes('Skipped')) return 'Cancelled'; // Maps to Cancelled in standard ERPNext DocType
  if (s.includes('Working') || s.includes('Progress')) return 'Working';
  if (s.includes('Completed') || s.includes('Finished')) return 'Completed';
  if (s.includes('Review')) return 'Pending Review';
  if (s.includes('Cancelled')) return 'Cancelled';
  return 'Open';
};

const mapPriorityToERPNext = (priority?: string): string => {
  if (!priority) return 'Medium';
  const p = priority.trim();
  if (p.includes('Urgent') || p.includes('Critical')) return 'Urgent';
  if (p.includes('High')) return 'High';
  if (p.includes('Low')) return 'Low';
  return 'Medium';
};

const cleanPayload = (data: Partial<Task>): Record<string, any> => {
  const payload: Record<string, any> = {};

  // Build description with embedded RASIC and SKIP_REASON blocks if provided
  let description = data.description || '';

  let targetRasic = data.rasic;
  if (!targetRasic && description.includes('<!-- RASIC:')) {
    try {
      const match = description.match(/<!-- RASIC: (.*?) -->/);
      if (match && match[1]) {
        targetRasic = JSON.parse(match[1]);
      }
    } catch {
      // fallback
    }
  }

  description = description.replace(/<!-- RASIC: .*? -->/, '').replace(/<!-- SKIP_REASON: .*? -->/, '').trim();

  if (targetRasic && Object.values(targetRasic).some(Boolean)) {
    description = `${description}\n\n<!-- RASIC: ${JSON.stringify(targetRasic)} -->`.trim();
    payload.rasic = targetRasic;
  }

  if (data.skip_reason) {
    description = `${description}\n\n<!-- SKIP_REASON: ${data.skip_reason} -->`.trim();
  }

  for (const [key, value] of Object.entries(data)) {
    if (ERPNEXT_ALLOWED_TASK_FIELDS.includes(key)) {
      if (value !== '' && value !== null && value !== undefined && !Number.isNaN(value)) {
        if (key === 'status') {
          payload.status = mapStatusToERPNext(String(value));
        } else if (key === 'priority') {
          payload.priority = mapPriorityToERPNext(String(value));
        } else if (key === 'exp_start_date' || key === 'exp_end_date') {
          const formattedDate = formatDateForERPNext(value);
          if (formattedDate) {
            payload[key] = formattedDate;
          }
        } else {
          payload[key] = value;
        }
      }
    }
  }

  if (description) {
    payload.description = description;
  }

  return payload;
};

export const taskService = {
  /**
   * Get paginated, filtered list of tasks from ERPNext
   */
  async getTasks(params: TaskListQueryParams = {}): Promise<TaskListResponse> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const limitStart = (page - 1) * pageSize;
    const sortBy = params.sortBy || 'modified';
    const sortOrder = params.sortOrder || 'desc';

    const filters: (string | number)[][] = [];

    if (params.project && params.project !== 'ALL') {
      filters.push(['project', '=', params.project]);
    }

    if (params.search && params.search.trim() !== '') {
      filters.push(['subject', 'like', `%${params.search.trim()}%`]);
    }

    if (params.status && params.status !== 'ALL') {
      filters.push(['status', '=', params.status]);
    }

    if (params.priority && params.priority !== 'ALL') {
      filters.push(['priority', '=', params.priority]);
    }

    const queryParts: string[] = [
      `fields=${encodeURIComponent(JSON.stringify(TASK_FIELDS))}`,
      `limit_start=${limitStart}`,
      `limit_page_length=${pageSize}`,
      `order_by=${encodeURIComponent(`${sortBy} ${sortOrder}`)}`,
    ];

    if (filters.length > 0) {
      queryParts.push(`filters=${encodeURIComponent(JSON.stringify(filters))}`);
    }

    const url = `/api/resource/Task?${queryParts.join('&')}`;

    try {
      const response = await api.get<{ data: any[] }>(url);
      const rawTasks = response.data || [];
      let tasks = rawTasks.map(normalizeTask);

      // Client-side additional filters if assigned_to or is_overdue specified
      if (params.assigned_to && params.assigned_to !== 'ALL') {
        const target = params.assigned_to.toLowerCase().trim();
        tasks = tasks.filter(
          (t) =>
            t.assigned_to?.toLowerCase().includes(target) ||
            t.assigned_employee_name?.toLowerCase().includes(target) ||
            (t.rasic?.responsible && t.rasic.responsible.toLowerCase().includes(target)) ||
            (t.rasic?.accountable && t.rasic.accountable.toLowerCase().includes(target)) ||
            (t.rasic?.support && t.rasic.support.toLowerCase().includes(target)) ||
            (t.rasic?.consulted && t.rasic.consulted.toLowerCase().includes(target)) ||
            (t.rasic?.informed && t.rasic.informed.toLowerCase().includes(target))
        );
      }

      if (params.is_overdue) {
        tasks = tasks.filter((t) => t.is_overdue);
      }

      // Calculate summary statistics dynamically
      const summary: TaskSummary = {
        totalTasks: tasks.length,
        openTasks: tasks.filter((t) => t.status === 'Open').length,
        inProgressTasks: tasks.filter((t) => t.status === 'Working' || t.status === 'In Progress').length,
        completedTasks: tasks.filter((t) => t.status === 'Completed').length,
        overdueTasks: tasks.filter((t) => t.is_overdue).length,
        unassignedTasks: tasks.filter((t) => !t.assigned_to || t.assigned_to === 'Unassigned').length,
        avgCompletionRate:
          tasks.length > 0
            ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length)
            : 0,
      };

      let totalCount = tasks.length;
      if (tasks.length === pageSize || page > 1) {
        totalCount = Math.max(page * pageSize, tasks.length + limitStart);
      }

      return {
        tasks,
        totalCount,
        page,
        pageSize,
        summary,
      };
    } catch (error: any) {
      console.warn('[ERPNext Task Service Warning] Fallback for task list:', error);
      return {
        tasks: [],
        totalCount: 0,
        page,
        pageSize,
        summary: {
          totalTasks: 0,
          openTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          unassignedTasks: 0,
          avgCompletionRate: 0,
        },
      };
    }
  },

  /**
   * Get single task details by Name / ID
   */
  async getTaskByName(name: string): Promise<Task> {
    try {
      const response = await api.get<{ data: any }>(
        `/api/resource/Task/${encodeURIComponent(name)}`
      );
      return normalizeTask(response.data);
    } catch (error: any) {
      console.error(`[ERPNext Task Service Error] Failed to fetch task ${name}:`, error);
      throw error;
    }
  },

  /**
   * Create task in ERPNext
   */
  async createTask(data: Partial<Task>): Promise<Task> {
    if (data.exp_start_date && data.exp_end_date) {
      const cleanStart = formatDateForERPNext(data.exp_start_date);
      const cleanEnd = formatDateForERPNext(data.exp_end_date);
      if (cleanStart && cleanEnd && cleanStart > cleanEnd) {
        throw new Error(`Task Expected End Date (${cleanEnd}) cannot be before Task Start Date (${cleanStart}).`);
      }
    }

    try {
      const payload = cleanPayload(data);
      const response = await api.post<{ data: any }>('/api/resource/Task', payload);
      const task = normalizeTask(response.data);

      const targetEmail = resolveUserEmail(data.assigned_to);
      if (targetEmail) {
        try {
          await api.post('/api/method/frappe.desk.form.assign_to.add', {
            doctype: 'Task',
            name: task.name,
            assign_to: JSON.stringify([targetEmail]),
          });
          task.assigned_to = targetEmail;
          task.assigned_employee_name = resolveUserDisplayName(targetEmail);
        } catch (err) {
          console.warn('[Task Assignment Warning]', err);
        }
      }

      return task;
    } catch (error: any) {
      console.error('[ERPNext Task Service Error] Failed to create task:', error);
      throw error;
    }
  },

  /**
   * Update task in ERPNext
   */
  async updateTask(name: string, data: Partial<Task>): Promise<Task> {
    if (data.exp_start_date && data.exp_end_date) {
      const cleanStart = formatDateForERPNext(data.exp_start_date);
      const cleanEnd = formatDateForERPNext(data.exp_end_date);
      if (cleanStart && cleanEnd && cleanStart > cleanEnd) {
        throw new Error(`Task Expected End Date (${cleanEnd}) cannot be before Task Start Date (${cleanStart}).`);
      }
    }

    const payload = cleanPayload(data);

    try {
      // Primary Attempt: Standard ERPNext REST Resource PUT
      const response = await api.put<{ data: any }>(
        `/api/resource/Task/${encodeURIComponent(name)}`,
        payload
      );

      const targetEmail = resolveUserEmail(data.assigned_to);
      if (targetEmail) {
        try {
          await api.post('/api/method/frappe.desk.form.assign_to.add', {
            doctype: 'Task',
            name: name,
            assign_to: JSON.stringify([targetEmail]),
          });
        } catch (err) {
          console.warn('[Task Assignment Warning]', err);
        }
      }

      return normalizeTask(response.data);
    } catch {
      try {
        // Secondary Attempt: ERPNext frappe.client.set_value RPC Endpoint
        const setValRes = await api.post<{ message: any }>(
          '/api/method/frappe.client.set_value',
          {
            doctype: 'Task',
            name: name,
            fieldname: payload,
          }
        );

        const targetEmail = resolveUserEmail(data.assigned_to);
        if (targetEmail) {
          try {
            await api.post('/api/method/frappe.desk.form.assign_to.add', {
              doctype: 'Task',
              name: name,
              assign_to: JSON.stringify([targetEmail]),
            });
          } catch (err) {
            console.warn('[Task Assignment Warning]', err);
          }
        }

        return normalizeTask(setValRes.message || { name, ...payload });
      } catch (error: any) {
        console.error(`[ERPNext Task Service Error] Failed to update task ${name}:`, error);
        throw error;
      }
    }
  },

  /**
   * Delete task in ERPNext
   */
  async deleteTask(name: string): Promise<void> {
    try {
      await api.delete(`/api/resource/Task/${encodeURIComponent(name)}`);
    } catch (error: any) {
      console.error(`[ERPNext Task Service Error] Failed to delete task ${name}:`, error);
      throw error;
    }
  },

  /**
   * Fetch comments/communications for task
   */
  async getTaskComments(taskName: string): Promise<TaskComment[]> {
    try {
      const filters = JSON.stringify([['reference_doctype', '=', 'Task'], ['reference_name', '=', taskName]]);
      const response = await api.get<{ data: any[] }>(
        `/api/resource/Comment?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(
          JSON.stringify(['name', 'comment', 'comment_by', 'creation'])
        )}`
      );
      return (response.data || []).map((c) => ({
        name: c.name,
        comment: c.comment,
        comment_by: c.comment_by || 'System',
        creation: c.creation,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch task submissions history
   */
  async getTaskSubmissions(taskName: string): Promise<TaskSubmission[]> {
    try {
      const response = await api.get<{ data: TaskSubmission[]; submissions: TaskSubmission[] }>(
        `/api/tasks/${encodeURIComponent(taskName)}/submissions`
      );
      return response.data || response.submissions || [];
    } catch {
      return [];
    }
  },

  /**
   * Submit task work package with comment, progress, and file deliverables
   */
  async submitTask(
    taskName: string,
    data: {
      comment: string;
      progress: number;
      projectId?: string;
      taskSubject?: string;
      files?: Array<{
        name: string;
        size: number;
        dataUrl?: string;
        file_url?: string;
        mimeType?: string;
      }>;
    }
  ): Promise<TaskSubmission> {
    const response = await api.post<{ success: boolean; data: TaskSubmission; submission: TaskSubmission }>(
      `/api/tasks/${encodeURIComponent(taskName)}/submissions`,
      data
    );
    return response.data || response.submission;
  },

  /**
   * Review task submission (Approve / Request Changes)
   */
  async reviewTaskSubmission(
    taskName: string,
    data: {
      submissionId: string;
      action: 'approve' | 'request_changes';
      comment: string;
    }
  ): Promise<TaskSubmission> {
    const response = await api.put<{ success: boolean; data: TaskSubmission; submission: TaskSubmission }>(
      `/api/tasks/${encodeURIComponent(taskName)}/submissions`,
      data
    );
    return response.data || response.submission;
  },

  /**
   * Fetch file attachments for task (combining ERPNext files, PDM Document Vault, and Task Submissions)
   */
  async getTaskAttachments(taskName: string): Promise<TaskAttachment[]> {
    const list: TaskAttachment[] = [];

    // 1. Fetch from Task Submissions Store
    try {
      const subs = await this.getTaskSubmissions(taskName);
      subs.forEach((sub) => {
        (sub.attachments || []).forEach((att: TaskSubmissionAttachment) => {
          if (!list.some((existing) => existing.file_name === att.file_name || existing.name === att.file_id)) {
            list.push({
              name: att.file_id,
              file_name: att.file_name,
              file_url: att.file_url || att.download_url || `/api/documents/${encodeURIComponent(att.file_id)}/download`,
              file_size: att.file_size,
              creation: att.uploaded_at || sub.submitted_at,
              uploaded_by: att.uploaded_by || sub.submitted_by_name,
              submission_id: sub.id,
            });
          }
        });
      });
    } catch {}

    // 2. Fetch from PDM DocumentStore
    try {
      const docRes = await api.get<{ documents: any[] }>(`/api/documents?task=${encodeURIComponent(taskName)}`);
      (docRes.documents || []).forEach((d) => {
        if (!list.some((existing) => existing.file_name === (d.file_name || d.title) || existing.name === d.name)) {
          list.push({
            name: d.name,
            file_name: d.file_name || d.title,
            file_url: d.file_url || `/api/documents/${d.name}/download`,
            file_size: d.file_size,
            creation: d.creation || d.upload_date,
            uploaded_by: d.uploaded_by,
          });
        }
      });
    } catch {}

    // 3. Fetch from Frappe File DocType
    try {
      const filters = JSON.stringify([
        ['attached_to_doctype', '=', 'Task'],
        ['attached_to_name', '=', taskName],
      ]);
      const response = await api.get<{ data: any[] }>(
        `/api/resource/File?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(
          JSON.stringify(['name', 'file_name', 'file_url', 'file_size', 'creation', 'owner'])
        )}`
      );
      (response.data || []).forEach((f) => {
        if (!list.some((existing) => existing.file_name === f.file_name || existing.name === f.name)) {
          list.push({
            name: f.name,
            file_name: f.file_name,
            file_url: f.file_url,
            file_size: f.file_size,
            creation: f.creation,
            uploaded_by: f.owner,
          });
        }
      });
    } catch {}

    return list;
  },
};

export default taskService;
