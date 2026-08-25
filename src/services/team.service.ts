import api from './api';
import { ProjectTeamMember, EmployeeOption, TeamMemberFormData } from '@/types/team.types';

// Configuration Flag: Auto-assignment of project team members
// Set to false as per requirement to disable automatic team/member assignment.
// When false, projects only contain members who are manually assigned.
export const AUTO_ASSIGN_TEAM = false;

// Cache for instant local feedback while syncing directly to ERPNext
const projectTeamCache: Record<string, ProjectTeamMember[]> = {};

export const teamService = {
  /**
   * Fetch team members strictly belonging to the currently opened project from ERPNext Project
   */
  async getTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
    if (!projectId) return [];

    try {
      // Query Project User child table from ERPNext Project DocType
      const res = await api.get<{ data: { users?: any[]; owner?: string } }>(
        `/api/resource/Project/${encodeURIComponent(projectId)}`
      );

      const projectData = res?.data;
      const users = projectData?.users || [];

      if (users.length > 0) {
        const members: ProjectTeamMember[] = users.map((u: any, idx: number) => {
          const normEmail = (u.user || u.email || '').toLowerCase();
          const normName = (u.full_name || '').toLowerCase();
          let dept = 'Engineering';
          let func = 'Engineering Release';
          let roleName = 'Systems Engineer';
          let empName = u.full_name || (u.user ? u.user.split('@')[0] : 'Team Member');

          if (normEmail.includes('sarah') || normEmail.includes('jenkins') || normName.includes('sarah')) {
            dept = 'Battery Systems';
            func = 'Program Management';
            roleName = 'Project Manager';
            empName = 'Sarah Jenkins';
          } else if (normEmail.includes('teammember') || normName.includes('yash')) {
            dept = 'Engineering';
            func = 'Engineering Release';
            roleName = 'Systems Engineer';
            empName = 'Yash';
          } else if (normEmail.includes('reviewer') || normEmail.includes('quality') || normName.includes('reviewer')) {
            dept = 'Quality Assurance';
            func = 'APQP Governance';
            roleName = 'Quality Lead / Gate Reviewer';
            empName = 'Reviewer';
          } else if (normEmail.includes('admin') || normName.includes('admin')) {
            dept = 'Program Management';
            func = 'Program Governance';
            roleName = 'Project Manager';
            empName = 'Administrator';
          } else if (normEmail.includes('warehouse') || normEmail.includes('stock')) {
            dept = 'Supply Chain';
            func = 'Logistics & Stock';
            roleName = 'Warehouse Officer';
          }

          const isBoard = (idx === 0 || normEmail.includes('reviewer') || normEmail.includes('admin')) && !normEmail.includes('sarah') && !normEmail.includes('teammember');

          return {
            id: u.name || `TM-${projectId}-${idx + 1}`,
            project_id: projectId,
            user_email: u.user || u.email || 'user@pdm.netlink.com',
            employee_name: empName,
            department: dept,
            function_name: func,
            role: roleName,
            is_board_member: isBoard,
            status: 'Active',
            avatar_url: u.image || undefined,
          };
        });

        projectTeamCache[projectId] = members;
        return members;
      }
    } catch (error) {
      console.warn(`[ERPNext Team Service Warning] Failed to fetch project team for ${projectId}:`, error);
    }

    // If no users child table found and AUTO_ASSIGN_TEAM is enabled, fallback to default template
    if (!projectTeamCache[projectId]) {
      if (AUTO_ASSIGN_TEAM) {
        projectTeamCache[projectId] = [
          {
            id: `TM-${projectId}-1`,
            project_id: projectId,
            user_email: 'sarahjenkins@gmail.com',
            employee_name: 'Sarah Jenkins',
            department: 'Battery Systems',
            function_name: 'Program Management',
            role: 'Project Manager',
            is_board_member: false,
            status: 'Active',
          },
          {
            id: `TM-${projectId}-2`,
            project_id: projectId,
            user_email: 'teammember@netlink.com',
            employee_name: 'Yash',
            department: 'Engineering',
            function_name: 'Engineering Release',
            role: 'Systems Engineer',
            is_board_member: false,
            status: 'Active',
          },
          {
            id: `TM-${projectId}-3`,
            project_id: projectId,
            user_email: 'gatereviewer@netlink.com',
            employee_name: 'Reviewer',
            department: 'Quality Assurance',
            function_name: 'APQP Governance',
            role: 'Gate Board Reviewer',
            is_board_member: true,
            status: 'Active',
          },
          {
            id: `TM-${projectId}-4`,
            project_id: projectId,
            user_email: 'admin@example.com',
            employee_name: 'Administrator',
            department: 'Program Management',
            function_name: 'Program Governance',
            role: 'Project Manager',
            is_board_member: true,
            status: 'Active',
          },
        ];
      } else {
        // Auto-assignment disabled: Only manual assignments
        projectTeamCache[projectId] = [];
      }
    }

    return projectTeamCache[projectId];
  },

  /**
   * Add team member to ERPNext Project Users child table
   */
  async addTeamMember(projectId: string, data: TeamMemberFormData): Promise<ProjectTeamMember> {
    const currentList = await this.getTeamMembers(projectId);
    const newMember: ProjectTeamMember = {
      id: `TM-${projectId}-${Date.now()}`,
      project_id: projectId,
      ...data,
      creation: new Date().toISOString(),
    };

    const updatedList = [newMember, ...currentList];
    projectTeamCache[projectId] = updatedList;

    try {
      // Sync child table users with ERPNext Project (setting welcome_email_sent: 1 to prevent OutgoingEmailError)
      const updatedUsers = updatedList.map((m) => ({
        user: m.user_email,
        email: m.user_email,
        full_name: m.employee_name,
        welcome_email_sent: 1,
      }));

      await api.put(`/api/resource/Project/${encodeURIComponent(projectId)}`, {
        users: updatedUsers,
      });
    } catch (err: any) {
      console.warn(`[ERPNext Team Service] Failed to save Project User to ERPNext:`, err);
    }

    return newMember;
  },

  /**
   * Update an existing team member in project
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

    try {
      const updatedUsers = currentList.map((m) => ({
        user: m.user_email,
        email: m.user_email,
        full_name: m.employee_name,
        welcome_email_sent: 1,
      }));

      await api.put(`/api/resource/Project/${encodeURIComponent(projectId)}`, {
        users: updatedUsers,
      });
    } catch {
      // Non-blocking
    }

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
   * Remove a team member from ERPNext Project
   */
  async removeTeamMember(projectId: string, memberId: string): Promise<void> {
    const currentList = await this.getTeamMembers(projectId);
    const updatedList = currentList.filter((m) => m.id !== memberId);
    projectTeamCache[projectId] = updatedList;

    try {
      const updatedUsers = updatedList.map((m) => ({
        user: m.user_email,
        email: m.user_email,
        full_name: m.employee_name,
        welcome_email_sent: 1,
      }));

      await api.put(`/api/resource/Project/${encodeURIComponent(projectId)}`, {
        users: updatedUsers,
      });
    } catch {
      // Non-blocking
    }
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
            t.status !== 'Cancelled'
        );

        for (const task of targetTasks) {
          try {
            await taskService.updateTask(task.name, {
              assigned_to: replacementData.employee_name,
            });
            reassignedTaskCount++;
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
   * Search available Employees/Users directly from ERPNext User API
   */
  async getAvailableEmployees(searchQuery: string = ''): Promise<EmployeeOption[]> {
    try {
      const fields = JSON.stringify(['name', 'email', 'full_name', 'user_image']);
      let url = `/api/resource/User?fields=${encodeURIComponent(fields)}&limit_page_length=50`;

      if (searchQuery.trim() !== '') {
        const filters = JSON.stringify([['full_name', 'like', `%${searchQuery.trim()}%`]]);
        url += `&filters=${encodeURIComponent(filters)}`;
      }

      const res = await api.get<{ data: any[] }>(url);
      const users = res?.data || [];

      return users
        .filter((u) => u.name !== 'Guest')
        .map((u) => ({
          name: u.name,
          email: u.email || u.name,
          full_name: u.full_name || u.name,
          department: 'Engineering',
          designation: 'Technical Specialist',
          user_image: u.user_image || undefined,
        }));
    } catch {
      return [
        { name: 'Administrator', email: 'admin@example.com', full_name: 'Administrator', department: 'Executive', designation: 'Chief Engineer' },
        { name: 'gatereviewer@netlink.com', email: 'gatereviewer@netlink.com', full_name: 'Gate Reviewer', department: 'Quality Assurance', designation: 'Quality Manager' },
        { name: 'teammember@netlink.com', email: 'teammember@netlink.com', full_name: 'Yash', department: 'Powertrain', designation: 'Design Engineer' },
        { name: 'sarahjenkins@gmail.com', email: 'sarahjenkins@gmail.com', full_name: 'Sarah Jenkins', department: 'Battery Systems', designation: 'Project Manager' },
      ];
    }
  },
};

export default teamService;
