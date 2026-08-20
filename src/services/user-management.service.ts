import api from './api';
import { PDMUserSession, PDMRole } from '@/types/auth.types';
import { PDM_ROLE_PERMISSIONS } from '@/config/pdm-users.config';

export interface CreateUserInput {
  fullName: string;
  email: string;
  employeeId: string;
  functionName: string;
  role: PDMRole;
  department: string;
  isActive?: boolean;
}

export interface UserRecord extends PDMUserSession {
  isActive: boolean;
  createdAt: string;
}

export const userManagementService = {
  /**
   * Get all registered system users directly from ERPNext User API
   */
  async getUsers(): Promise<UserRecord[]> {
    try {
      const response = await api.get<{ data: any[] }>(
        `/api/resource/User?fields=${encodeURIComponent(
          JSON.stringify(['name', 'email', 'full_name', 'enabled', 'user_type', 'creation'])
        )}&limit_page_length=100`
      );

      const erpUsers = response.data || [];

      return erpUsers
        .filter((u) => u.name !== 'Guest')
        .map((u) => {
          const normEmail = (u.email || u.name).toLowerCase();
          let role: PDMRole = 'teammember';
          let roleLabel = 'Projects User';

          if (normEmail.includes('admin')) {
            role = 'admin';
            roleLabel = 'System Manager / PMO Director';
          } else if (normEmail.includes('it')) {
            role = 'it_admin';
            roleLabel = 'IT Administrator';
          } else if (normEmail.includes('reviewer') || normEmail.includes('approver')) {
            role = 'gate_reviewer';
            roleLabel = 'Quality Manager / Gate Reviewer';
          } else if (normEmail.includes('warehouse') || normEmail.includes('store')) {
            role = 'warehouse_user';
            roleLabel = 'Stock Manager / Warehouse Officer';
          } else if (normEmail.includes('manager') || normEmail.includes('pm')) {
            role = 'projectmanager';
            roleLabel = 'Projects Manager';
          }

          const roleConfig = PDM_ROLE_PERMISSIONS[role];

          return {
            username: u.name,
            email: u.email || u.name,
            fullName: u.full_name || u.name,
            role,
            roleLabel,
            department: 'Engineering',
            functionName: 'Engineering',
            employeeId: `EMP-${u.name.substring(0, 5).toUpperCase()}`,
            permissions: roleConfig.permissions,
            roles: [roleLabel],
            isActive: Boolean(u.enabled),
            createdAt: u.creation || new Date().toISOString(),
          };
        });
    } catch (error) {
      console.warn('[User Management Warning] Fallback to client state:', error);
      return [];
    }
  },

  /**
   * Create actual user in ERPNext User DocType (IT Admin workflow)
   */
  async addUser(input: CreateUserInput): Promise<UserRecord> {
    const existingUsers = await this.getUsers();

    const emailExists = existingUsers.some(
      (u) => u.email.toLowerCase().trim() === input.email.toLowerCase().trim()
    );
    if (emailExists) {
      throw new Error(`A user with email "${input.email}" already exists in ERPNext.`);
    }

    const erpRoleName =
      input.role === 'admin'
        ? 'System Manager'
        : input.role === 'projectmanager'
          ? 'Projects Manager'
          : input.role === 'gate_reviewer'
            ? 'Quality Manager'
            : input.role === 'warehouse_user'
              ? 'Stock Manager'
              : 'Projects User';

    const userPayload = {
      email: input.email.trim(),
      first_name: input.fullName.trim(),
      enabled: 1,
      send_welcome_email: 0,
      user_type: 'System User',
      roles: [{ role: erpRoleName }, { role: 'Employee' }],
    };

    try {
      const response = await api.post<{ data: any }>('/api/resource/User', userPayload);
      const newErpUser = response.data;

      const roleConfig = PDM_ROLE_PERMISSIONS[input.role];

      return {
        username: newErpUser.name,
        email: newErpUser.email || input.email,
        fullName: newErpUser.full_name || input.fullName,
        role: input.role,
        roleLabel: roleConfig.label,
        department: input.department || 'Engineering',
        functionName: input.functionName || 'Engineering',
        employeeId: input.employeeId || `EMP-${newErpUser.name.substring(0, 5)}`,
        permissions: roleConfig.permissions,
        roles: [erpRoleName],
        isActive: true,
        createdAt: newErpUser.creation || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[User Management Error] Failed to create user in ERPNext:', error);
      throw new Error(error.message || 'Failed to create user in ERPNext');
    }
  },

  /**
   * Toggle active/inactive status in ERPNext
   */
  async toggleUserStatus(userEmail: string, currentEnabledStatus: boolean): Promise<void> {
    try {
      await api.put(`/api/resource/User/${encodeURIComponent(userEmail)}`, {
        enabled: currentEnabledStatus ? 0 : 1,
      });
    } catch (error: any) {
      console.error(`[User Management Error] Failed to toggle status for ${userEmail}:`, error);
      throw error;
    }
  },
};
