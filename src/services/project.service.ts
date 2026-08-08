import api from './api';
import { Project, ProjectListQueryParams, ProjectListResponse } from '@/types/project.types';

const PROJECT_FIELDS = [
  'name',
  'project_name',
  'status',
  'priority',
  'project_type',
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

const cleanPayload = (data: Partial<Project>): Record<string, any> => {
  const payload: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== '' && value !== null && value !== undefined && !Number.isNaN(value)) {
      payload[key] = value;
    }
  }
  const cost = data.estimated_costing ?? data.estimated_cost;
  if (cost !== undefined && !Number.isNaN(cost) && cost !== null) {
    payload.estimated_costing = cost;
  }
  delete payload.estimated_cost;
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
