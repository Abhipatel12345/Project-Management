import api from './api';
import issueService from './issue.service';
import documentService from './document.service';
import designReviewService from './design-review.service';
import gateService from './gate.service';

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
  project?: string;
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
  upcomingGates: number;
  pendingDesignReviews: number;
  documentsUnderReview: number;
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
   * Fetch Issues via issueService (Single Source of Truth)
   */
  async getIssues(): Promise<DashboardIssueItem[]> {
    try {
      const res = await issueService.getIssues({ pageSize: 100 });
      return res.issues;
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
   * Aggregate Real ERPNext & Module Metrics using Services as Single Source of Truth
   */
  async getDashboardSummary(): Promise<DashboardSummaryData> {
    const [projects, tasks, issueRes, docRes, reviewRes, gateRes, recentActivities] = await Promise.all([
      this.getProjects(),
      this.getTasks(),
      issueService.getIssues({ pageSize: 100 }),
      documentService.getDocuments({ pageSize: 100 }),
      designReviewService.getDesignReviews({ pageSize: 100 }),
      gateService.getGates({ pageSize: 100 }),
      this.getRecentActivities(),
    ]);

    const activeProjects = projects.filter(
      (p: any) => p.status && p.status !== 'Completed' && p.status !== 'Cancelled'
    ).length;

    const pendingTasks = tasks.filter(
      (t: any) => t.status && t.status !== 'Completed' && t.status !== 'Closed'
    ).length;

    const issues = issueRes.issues;
    const summary = issueRes.summary;

    return {
      totalProjects: projects.length,
      activeProjects,
      totalTasks: tasks.length,
      pendingTasks,
      openIssues: summary.openIssues,
      criticalIssues: summary.highPriorityIssues + summary.urgentIssues,
      upcomingGates: gateRes.summary.upcomingGates,
      pendingDesignReviews: reviewRes.summary.plannedReviews + reviewRes.summary.inProgressReviews,
      documentsUnderReview: docRes.summary.requiringReview,
      projects,
      tasks,
      issues,
      recentActivities,
    };
  },
};

export default dashboardService;
