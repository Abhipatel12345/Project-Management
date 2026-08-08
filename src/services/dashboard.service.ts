import api from './api';

export interface DashboardProjectItem {
  name: string;
  project_name: string;
  status: string;
  percent_complete?: number;
  expected_end_date?: string;
  priority?: string;
}

export interface DashboardTaskItem {
  name: string;
  subject: string;
  status: string;
  priority: string;
  exp_end_date?: string;
  project?: string;
}

export interface DashboardIssueItem {
  name: string;
  subject: string;
  status: string;
  priority: string;
  raised_by?: string;
  creation?: string;
}

export interface DashboardActivityItem {
  name: string;
  subject: string;
  user: string;
  timestamp: string;
  type: 'project' | 'task' | 'issue' | 'gate';
}

export interface DashboardSummaryData {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  pendingTasks: number;
  openIssues: number;
  criticalIssues: number;
  projects: DashboardProjectItem[];
  tasks: DashboardTaskItem[];
  issues: DashboardIssueItem[];
  recentActivities: DashboardActivityItem[];
}

export const dashboardService = {
  /**
   * Fetch Projects from ERPNext REST API (/api/resource/Project)
   */
  async getProjects(): Promise<DashboardProjectItem[]> {
    try {
      const response = await api.get<{ data: DashboardProjectItem[] }>(
        '/api/resource/Project?fields=["name","project_name","status","percent_complete","expected_end_date"]&limit_page_length=20&order_by=modified desc'
      );
      return response.data || [];
    } catch (error) {
      console.error('[ERPNext API Error] Failed to fetch Projects:', error);
      return [];
    }
  },

  /**
   * Fetch Tasks from ERPNext REST API (/api/resource/Task)
   */
  async getTasks(): Promise<DashboardTaskItem[]> {
    try {
      const response = await api.get<{ data: DashboardTaskItem[] }>(
        '/api/resource/Task?fields=["name","subject","status","priority","exp_end_date","project"]&limit_page_length=20&order_by=modified desc'
      );
      return response.data || [];
    } catch (error) {
      console.error('[ERPNext API Error] Failed to fetch Tasks:', error);
      return [];
    }
  },

  /**
   * Fetch Issues from ERPNext REST API (/api/resource/Issue)
   */
  async getIssues(): Promise<DashboardIssueItem[]> {
    try {
      const response = await api.get<{ data: DashboardIssueItem[] }>(
        '/api/resource/Issue?fields=["name","subject","status","priority","raised_by","creation"]&limit_page_length=20&order_by=modified desc'
      );
      return response.data || [];
    } catch (error) {
      console.error('[ERPNext API Error] Failed to fetch Issues:', error);
      return [];
    }
  },

  /**
   * Fetch Real ERPNext Version Activity Logs or standard recent updates
   */
  async getRecentActivities(): Promise<DashboardActivityItem[]> {
    try {
      const response = await api.get<{ data: { name: string; subject?: string; owner?: string; creation?: string }[] }>(
        '/api/resource/Version?fields=["name","owner","creation"]&limit_page_length=5&order_by=creation desc'
      );

      if (response?.data && response.data.length > 0) {
        return response.data.map((item) => ({
          name: item.name,
          subject: `System record updated (${item.name})`,
          user: item.owner || 'System',
          timestamp: item.creation ? new Date(item.creation).toLocaleTimeString() : 'Recently',
          type: 'project',
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Aggregate Real ERPNext Metrics
   */
  async getDashboardSummary(): Promise<DashboardSummaryData> {
    const [projects, tasks, issues, recentActivities] = await Promise.all([
      this.getProjects(),
      this.getTasks(),
      this.getIssues(),
      this.getRecentActivities(),
    ]);

    const activeProjects = projects.filter(
      (p) => p.status && p.status !== 'Completed' && p.status !== 'Cancelled'
    ).length;

    const pendingTasks = tasks.filter(
      (t) => t.status && t.status !== 'Completed' && t.status !== 'Closed'
    ).length;

    const criticalIssues = issues.filter(
      (i) => i.priority === 'Critical' || i.priority === 'High' || i.priority === 'Urgent'
    ).length;

    return {
      totalProjects: projects.length,
      activeProjects,
      totalTasks: tasks.length,
      pendingTasks,
      openIssues: issues.length,
      criticalIssues,
      projects,
      tasks,
      issues,
      recentActivities,
    };
  },
};

export default dashboardService;
