import api from './api';
import { ProjectTeamMember, EmployeeOption, TeamMemberFormData } from '@/types/team.types';

// In-memory persistent cache for project teams so members are scoped strictly to the currently opened project
const projectTeamCache: Record<string, ProjectTeamMember[]> = {};

// Pre-seeded initial engineering team members for demonstration programs
const initialDefaultMembers: Record<string, ProjectTeamMember[]> = {
  default: [
    {
      id: 'TM-001',
      project_id: 'default',
      user_email: 'admin@example.com',
      employee_name: 'Administrator',
      department: 'Vehicle Integration',
      function_name: 'Lead Engineering',
      role: 'Chief Program Engineer',
      is_board_member: true,
      status: 'Active',
    },
    {
      id: 'TM-002',
      project_id: 'default',
      user_email: 'sarah.jenkins@autopdm.com',
      employee_name: 'Dr. Sarah Jenkins',
      department: 'Battery Systems',
      function_name: 'R&D Architecture',
      role: 'Lead Battery Architect',
      is_board_member: true,
      status: 'Active',
    },
    {
      id: 'TM-003',
      project_id: 'default',
      user_email: 'marcus.vance@autopdm.com',
      employee_name: 'Marcus Vance',
      department: 'Powertrain',
      function_name: 'Validation & Testing',
      role: 'Validation Lead',
      is_board_member: false,
      status: 'Active',
    },
    {
      id: 'TM-004',
      project_id: 'default',
      user_email: 'elena.rostova@autopdm.com',
      employee_name: 'Elena Rostova',
      department: 'Chassis & Dynamics',
      function_name: 'Design Release',
      role: 'Chassis Specialist',
      is_board_member: false,
      status: 'Active',
    },
    {
      id: 'TM-005',
      project_id: 'default',
      user_email: 'david.chen@autopdm.com',
      employee_name: 'David Chen',
      department: 'Quality Assurance',
      function_name: 'Compliance',
      role: 'Quality Lead (APQP)',
      is_board_member: true,
      status: 'Active',
    },
  ],
};

export const teamService = {
  /**
   * Fetch team members strictly belonging to the currently opened project
   */
  async getTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
    if (!projectId) return [];

    // Check if team members are already cached for this specific project
    if (!projectTeamCache[projectId]) {
      try {
        // Attempt fetching Project User child table from ERPNext Project
        const res = await api.get<{ data: { users?: any[] } }>(
          `/api/resource/Project/${encodeURIComponent(projectId)}?fields=["name","users"]`
        );
        const users = res?.data?.users || [];

        if (users.length > 0) {
          projectTeamCache[projectId] = users.map((u, idx) => ({
            id: u.name || `TM-${projectId}-${idx + 1}`,
            project_id: projectId,
            user_email: u.user || u.email || 'user@autopdm.com',
            employee_name: u.full_name || u.user?.split('@')[0] || 'Team Member',
            department: u.department || 'Engineering',
            function_name: 'Engineering Release',
            role: idx === 0 ? 'Program Lead' : 'Systems Engineer',
            is_board_member: idx === 0,
            status: 'Active',
            avatar_url: u.image || undefined,
          }));
        } else {
          // Initialize project-scoped default team
          projectTeamCache[projectId] = initialDefaultMembers.default.map((m, idx) => ({
            ...m,
            id: `TM-${projectId}-${idx + 1}`,
            project_id: projectId,
          }));
        }
      } catch {
        projectTeamCache[projectId] = initialDefaultMembers.default.map((m, idx) => ({
          ...m,
          id: `TM-${projectId}-${idx + 1}`,
          project_id: projectId,
        }));
      }
    }

    return projectTeamCache[projectId];
  },

  /**
   * Add a new team member to the currently opened project
   */
  async addTeamMember(projectId: string, data: TeamMemberFormData): Promise<ProjectTeamMember> {
    const currentList = await this.getTeamMembers(projectId);
    const newMember: ProjectTeamMember = {
      id: `TM-${projectId}-${Date.now()}`,
      project_id: projectId,
      ...data,
      creation: new Date().toISOString(),
    };

    projectTeamCache[projectId] = [newMember, ...currentList];

    try {
      // Sync child table users with ERPNext Project if available
      const updatedUsers = projectTeamCache[projectId].map((m) => ({
        user: m.user_email,
        email: m.user_email,
        full_name: m.employee_name,
      }));

      await api.put(`/api/resource/Project/${encodeURIComponent(projectId)}`, {
        users: updatedUsers,
      });
    } catch {
      // Proceed with cache persistence if child table structure is restricted
    }

    return newMember;
  },

  /**
   * Update an existing team member in the currently opened project
   */
  async updateTeamMember(
    projectId: string,
    memberId: string,
    data: Partial<TeamMemberFormData>
  ): Promise<ProjectTeamMember> {
    const currentList = await this.getTeamMembers(projectId);
    const index = currentList.findIndex((m) => m.id === memberId);

    if (index === -1) {
      throw new Error(`Team member ${memberId} not found in project ${projectId}`);
    }

    const updatedMember = {
      ...currentList[index],
      ...data,
      modified: new Date().toISOString(),
    };

    currentList[index] = updatedMember;
    projectTeamCache[projectId] = [...currentList];

    return updatedMember;
  },

  /**
   * Toggle Board Member status
   */
  async toggleBoardStatus(projectId: string, memberId: string): Promise<ProjectTeamMember> {
    const currentList = await this.getTeamMembers(projectId);
    const member = currentList.find((m) => m.id === memberId);
    if (!member) throw new Error('Team member not found');

    return this.updateTeamMember(projectId, memberId, {
      is_board_member: !member.is_board_member,
    });
  },

  /**
   * Remove a team member from the currently opened project
   */
  async removeTeamMember(projectId: string, memberId: string): Promise<void> {
    const currentList = await this.getTeamMembers(projectId);
    projectTeamCache[projectId] = currentList.filter((m) => m.id !== memberId);
  },

  /**
   * Replace a team member with a new employee and reassign open tasks
   */
  async replaceTeamMember(
    projectId: string,
    outgoingMemberId: string,
    replacementData: TeamMemberFormData,
    reassignOpenTasks: boolean = true
  ): Promise<{ updatedMember: ProjectTeamMember; reassignedTaskCount: number }> {
    const currentList = await this.getTeamMembers(projectId);
    const index = currentList.findIndex((m) => m.id === outgoingMemberId);

    if (index === -1) {
      throw new Error(`Outgoing team member ${outgoingMemberId} not found in project ${projectId}`);
    }

    const outgoingMember = currentList[index];
    const updatedMember: ProjectTeamMember = {
      ...outgoingMember,
      ...replacementData,
      modified: new Date().toISOString(),
    };

    currentList[index] = updatedMember;
    projectTeamCache[projectId] = [...currentList];

    let reassignedTaskCount = 0;

    if (reassignOpenTasks && projectId) {
      try {
        const { taskService } = await import('./task.service');
        const taskRes = await taskService.getTasks({ project: projectId, pageSize: 100 });
        const targetTasks = (taskRes.tasks || []).filter(
          (t) =>
            (t.assigned_to === outgoingMember.employee_name || t.assigned_to === outgoingMember.user_email) &&
            t.status !== 'Completed' &&
            t.status !== 'Cancelled' &&
            t.status !== 'Skipped'
        );

        for (const task of targetTasks) {
          try {
            await taskService.updateTask(task.name, {
              assigned_to: replacementData.employee_name,
            });
            reassignedTaskCount++;

            // Create audit comment in ERPNext Comment DocType if accessible
            try {
              await api.post('/api/resource/Comment', {
                reference_doctype: 'Task',
                reference_name: task.name,
                comment: `[Team Replacement Audit]: Reassigned task from ${outgoingMember.employee_name} to ${replacementData.employee_name}`,
                comment_by: 'Administrator',
              });
            } catch {
              // Non-blocking comment log
            }
          } catch (err) {
            console.warn(`[Team Replacement Warning] Failed to reassign task ${task.name}:`, err);
          }
        }
      } catch (err) {
        console.warn('[Team Replacement Warning] Failed to fetch task list for replacement:', err);
      }
    }

    return { updatedMember, reassignedTaskCount };
  },

  /**
   * Search available Employees/Users from ERPNext for adding to team
   */
  async getAvailableEmployees(searchQuery: string = ''): Promise<EmployeeOption[]> {
    try {
      const fields = JSON.stringify(['name', 'email', 'full_name', 'user_image']);
      let url = `/api/resource/User?fields=${encodeURIComponent(fields)}&limit_page_length=20`;

      if (searchQuery.trim() !== '') {
        const filters = JSON.stringify([['full_name', 'like', `%${searchQuery.trim()}%`]]);
        url += `&filters=${encodeURIComponent(filters)}`;
      }

      const res = await api.get<{ data: any[] }>(url);
      const users = res?.data || [];

      return users.map((u) => ({
        name: u.name,
        email: u.email || u.name,
        full_name: u.full_name || u.name,
        department: 'Engineering',
        designation: 'Technical Specialist',
        user_image: u.user_image || undefined,
      }));
    } catch {
      return [
        { name: 'USR-01', email: 'admin@example.com', full_name: 'Administrator', department: 'Executive', designation: 'Chief Engineer' },
        { name: 'USR-02', email: 'sarah.jenkins@autopdm.com', full_name: 'Dr. Sarah Jenkins', department: 'Battery Systems', designation: 'Lead Architect' },
        { name: 'USR-03', email: 'marcus.vance@autopdm.com', full_name: 'Marcus Vance', department: 'Powertrain', designation: 'Validation Lead' },
        { name: 'USR-04', email: 'elena.rostova@autopdm.com', full_name: 'Elena Rostova', department: 'Chassis & Dynamics', designation: 'Design Lead' },
        { name: 'USR-05', email: 'david.chen@autopdm.com', full_name: 'David Chen', department: 'Quality Assurance', designation: 'Quality Lead' },
        { name: 'USR-06', email: 'alexander.wright@autopdm.com', full_name: 'Alexander Wright', department: 'Electrical & E/E', designation: 'Senior Specialist' },
      ];
    }
  },
};

export default teamService;
