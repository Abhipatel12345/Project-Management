import api from './api';
import { Project, ProjectListQueryParams, ProjectListResponse } from '@/types/project.types';

const PROJECT_FIELDS = [
  'name',
  'project_name',
  'status',
  'priority',
  'project_type',
  'custom_project_category',
  'custom_product_group',
  'percent_complete',
  'expected_start_date',
  'expected_end_date',
  'actual_start_date',
  'actual_end_date',
  'estimated_costing',
  'total_costing_amount',
  'company',
  'department',
  'notes',
  'creation',
  'modified',
  'owner',
];

const normalizeProject = (p: Project): Project => ({
  ...p,
  estimated_cost: p.estimated_costing ?? p.estimated_cost ?? 0,
});

const formatErpDate = (val?: string | null): string | undefined => {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  // If MM/DD/YYYY or DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return trimmed;
};

const cleanPayload = (data: Partial<Project>): Record<string, any> => {
  const payload: Record<string, any> = {};

  // Copy valid non-empty fields
  for (const [key, value] of Object.entries(data)) {
    if (value !== '' && value !== null && value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
      payload[key] = value;
    }
  }

  // Map estimated_cost -> estimated_costing (ERPNext fieldname)
  const cost = data.estimated_costing ?? data.estimated_cost;
  if (cost !== undefined && cost !== null && !Number.isNaN(Number(cost))) {
    payload.estimated_costing = Number(cost);
  }
  delete payload.estimated_cost;

  // Ensure percent_complete is a number
  if (data.percent_complete !== undefined && data.percent_complete !== null && !Number.isNaN(Number(data.percent_complete))) {
    payload.percent_complete = Number(data.percent_complete);
  }

  // ERPNext select mappings
  if (payload.priority === 'Critical') {
    payload.priority = 'High';
  }

  // Remove empty string or default "Select..." entries for custom fields
  if (payload.custom_project_category === 'Select' || payload.custom_project_category === '') {
    delete payload.custom_project_category;
  }
  if (payload.custom_product_group === 'Select' || payload.custom_product_group === '') {
    delete payload.custom_product_group;
  }

  // Format date fields to YYYY-MM-DD, or remove if empty/invalid
  const dateFields = ['expected_start_date', 'expected_end_date', 'actual_start_date', 'actual_end_date'];
  for (const df of dateFields) {
    if (payload[df]) {
      const formatted = formatErpDate(payload[df]);
      if (formatted && formatted.trim() !== '') {
        payload[df] = formatted;
      } else {
        delete payload[df];
      }
    } else {
      delete payload[df];
    }
  }

  // Strip non-existent ERPNext fields
  delete payload.custom_product_line;

  // Log final payload before POST/PUT request (STEP 1)
  console.log('[ERPNext API Request] Project Payload:', JSON.stringify(payload, null, 2));

  return payload;
};

export const projectService = {
  /**
   * Fetch paginated & filtered list of Projects from ERPNext
   */
  async getProjects(params: ProjectListQueryParams = {}): Promise<ProjectListResponse> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const limitStart = (page - 1) * pageSize;
    const sortBy = params.sortBy || 'modified';
    const sortOrder = params.sortOrder || 'desc';

    const filters: (string | number)[][] = [];

    if (params.search && params.search.trim() !== '') {
      filters.push(['project_name', 'like', `%${params.search.trim()}%`]);
    }

    if (params.status && params.status !== 'ALL') {
      filters.push(['status', '=', params.status]);
    }

    if (params.priority && params.priority !== 'ALL') {
      filters.push(['priority', '=', params.priority]);
    }

    if (params.project_type && params.project_type !== 'ALL') {
      filters.push(['project_type', '=', params.project_type]);
    }

    const queryParts: string[] = [
      `fields=${encodeURIComponent(JSON.stringify(PROJECT_FIELDS))}`,
      `limit_start=${limitStart}`,
      `limit_page_length=${pageSize}`,
      `order_by=${encodeURIComponent(`${sortBy} ${sortOrder}`)}`,
    ];

    if (filters.length > 0) {
      queryParts.push(`filters=${encodeURIComponent(JSON.stringify(filters))}`);
    }

    const url = `/api/resource/Project?${queryParts.join('&')}`;

    try {
      const response = await api.get<{ data: Project[] }>(url);
      const rawProjects = response.data || [];
      const projects = rawProjects.map(normalizeProject);

      // Fetch count estimate or calculate
      let totalCount = projects.length;
      if (projects.length === pageSize || page > 1) {
        totalCount = Math.max(page * pageSize, projects.length + limitStart);
      }

      return {
        projects,
        totalCount,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error('[ERPNext API Error] Failed to fetch Projects:', error);
      throw error;
    }
  },

  /**
   * Fetch single Project details by ID/Name
   */
  async getProjectByName(name: string): Promise<Project> {
    try {
      const response = await api.get<{ data: Project }>(
        `/api/resource/Project/${encodeURIComponent(name)}`
      );
      return normalizeProject(response.data);
    } catch (error: any) {
      console.error(`[ERPNext API Error] Failed to fetch Project ${name}:`, error);
      throw error;
    }
  },

  /**
   * Create a new Project in ERPNext
   */
  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      const payload = cleanPayload(data);
      const response = await api.post<{ data: Project }>('/api/resource/Project', payload);
      return normalizeProject(response.data);
    } catch (error: any) {
      console.error('[ERPNext API Error] Failed to create Project:', error);
      throw error;
    }
  },

  /**
   * Update an existing Project in ERPNext
   */
  async updateProject(name: string, data: Partial<Project>): Promise<Project> {
    try {
      const payload = cleanPayload(data);
      const response = await api.put<{ data: Project }>(
        `/api/resource/Project/${encodeURIComponent(name)}`,
        payload
      );
      return normalizeProject(response.data);
    } catch (error: any) {
      console.error(`[ERPNext API Error] Failed to update Project ${name}:`, error);
      throw error;
    }
  },

  /**
   * Delete/Archive a Project in ERPNext
   */
  async deleteProject(name: string): Promise<void> {
    try {
      await api.delete(`/api/resource/Project/${encodeURIComponent(name)}`);
    } catch (error: any) {
      console.error(`[ERPNext API Error] Failed to delete Project ${name}:`, error);
      throw error;
    }
  },
};

export default projectService;
