import api from './api';
import projectService from './project.service';
import taskService from './task.service';
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
   * Fetch Projects from ERPNext REST API (/api/resource/Project) with fallback to projectService
   */
  async getProjects(): Promise<DashboardProjectItem[]> {
    try {
      const fields = ['name', 'project_name', 'status', 'percent_complete', 'expected_end_date', 'owner', 'priority'];
      const url = `/api/resource/Project?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=500&order_by=${encodeURIComponent('modified desc')}`;
      const response = await api.get<{ data: DashboardProjectItem[] }>(url);
      if (response && Array.isArray(response.data)) {
        return response.data;
      }
      throw new Error('Project data format unexpected');
    } catch (error) {
      console.warn('[dashboardService] Direct Project fetch failed, falling back to projectService:', error);
      try {
        const res = await projectService.getProjects({ pageSize: 500 });
        return (res.projects || []).map((p) => ({
          name: p.name,
          project_name: p.project_name || p.name,
          status: p.status || 'Open',
          percent_complete: p.percent_complete ?? 0,
          expected_end_date: p.expected_end_date || '',
          priority: p.priority || 'Medium',
        }));
      } catch (fallbackErr) {
        console.error('[dashboardService] All project fetch attempts failed:', fallbackErr);
        throw fallbackErr;
      }
    }
  },

  /**
   * Fetch Tasks from ERPNext REST API (/api/resource/Task) with fallback to taskService
   */
  async getTasks(): Promise<DashboardTaskItem[]> {
    try {
      const fields = ['name', 'subject', 'status', 'priority', 'exp_end_date', 'project'];
      const url = `/api/resource/Task?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=500&order_by=${encodeURIComponent('modified desc')}`;
      const response = await api.get<{ data: DashboardTaskItem[] }>(url);
      if (response && Array.isArray(response.data)) {
        return response.data;
      }
      throw new Error('Task data format unexpected');
    } catch (error) {
      console.warn('[dashboardService] Direct Task fetch failed, falling back to taskService:', error);
      try {
        const res = await taskService.getTasks({ pageSize: 500 });
        return (res.tasks || []).map((t) => ({
          name: t.name,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          exp_end_date: t.exp_end_date,
          project: t.project,
        }));
      } catch (fallbackErr) {
        console.error('[dashboardService] All task fetch attempts failed:', fallbackErr);
        throw fallbackErr;
      }
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
      console.warn('[dashboardService] Failed to fetch Issues:', error);
      return [];
    }
  },

  /**
   * Fetch Real ERPNext Version Activity Logs or standard recent updates
   */
  async getRecentActivities(): Promise<DashboardActivityItem[]> {
    try {
      const fields = ['name', 'owner', 'creation'];
      const url = `/api/resource/Version?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=5&order_by=${encodeURIComponent('creation desc')}`;
      const response = await api.get<{ data: { name: string; subject?: string; owner?: string; creation?: string }[] }>(url);

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
    const [projectsRes, tasksRes, issueRes, docRes, reviewRes, gateRes, activityRes] = await Promise.allSettled([
      this.getProjects(),
      this.getTasks(),
      issueService.getIssues({ pageSize: 100 }),
      documentService.getDocuments({ pageSize: 100 }),
      designReviewService.getDesignReviews({ pageSize: 100 }),
      gateService.getGates({ pageSize: 100 }),
      this.getRecentActivities(),
    ]);

    // If both primary data sources (Projects and Tasks) failed, propagate error to React Query
    if (projectsRes.status === 'rejected' && tasksRes.status === 'rejected') {
      const err = projectsRes.reason || new Error('Failed to retrieve ERPNext project information');
      throw err;
    }

    const projects: DashboardProjectItem[] = projectsRes.status === 'fulfilled' ? projectsRes.value : [];
    const tasks: DashboardTaskItem[] = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
    const issueData = issueRes.status === 'fulfilled' ? issueRes.value : null;
    const docData = docRes.status === 'fulfilled' ? docRes.value : null;
    const reviewData = reviewRes.status === 'fulfilled' ? reviewRes.value : null;
    const gateData = gateRes.status === 'fulfilled' ? gateRes.value : null;
    const activities = activityRes.status === 'fulfilled' ? activityRes.value : [];

    const activeProjects = projects.filter(
      (p: any) => p.status && p.status !== 'Completed' && p.status !== 'Cancelled'
    ).length;

    const pendingTasks = tasks.filter(
      (t: any) => t.status && t.status !== 'Completed' && t.status !== 'Closed'
    ).length;

    const issues = issueData?.issues || [];
    const summary = issueData?.summary;

    return {
      totalProjects: projects.length,
      activeProjects,
      totalTasks: tasks.length,
      pendingTasks,
      openIssues: summary?.openIssues ?? issues.filter((i) => i.status === 'Open').length,
      criticalIssues: ((summary?.highPriorityIssues ?? 0) + (summary?.urgentIssues ?? 0)),
      upcomingGates: gateData?.summary?.upcomingGates ?? 0,
      pendingDesignReviews: ((reviewData?.summary?.plannedReviews ?? 0) + (reviewData?.summary?.inProgressReviews ?? 0)),
      documentsUnderReview: docData?.summary?.requiringReview ?? 0,
      projects,
      tasks,
      issues,
      recentActivities: activities,
    };
  },
};

export default dashboardService;
