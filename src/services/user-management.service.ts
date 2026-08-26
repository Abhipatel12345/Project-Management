import api from './api';
import { PDMUserSession, PDMRole } from '@/types/auth.types';
import { PDM_ROLE_PERMISSIONS } from '@/config/pdm-users.config';

export interface CreateERPNextUserInput {
  email: string;
  first_name?: string;
  fullName?: string;
  middle_name?: string;
  last_name?: string;
  username?: string;
  enabled?: boolean;
  send_welcome_email?: boolean;
  language?: string;
  time_zone?: string;
  role: PDMRole;
  phone?: string;
  mobile_no?: string;
  gender?: string;
  bio?: string;
  desk_theme?: string;
  mute_sounds?: boolean;
  department?: string;
  functionName?: string;
  employeeId?: string;
}

export interface UpdateERPNextUserInput {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  enabled?: boolean;
  send_welcome_email?: boolean;
  language?: string;
  time_zone?: string;
  role?: PDMRole;
  phone?: string;
  mobile_no?: string;
  gender?: string;
  bio?: string;
  desk_theme?: string;
  mute_sounds?: boolean;
}

export interface UserRecord extends PDMUserSession {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  language?: string;
  time_zone?: string;
  send_welcome_email?: boolean;
  phone?: string;
  mobile_no?: string;
  gender?: string;
  bio?: string;
  desk_theme?: string;
  mute_sounds?: boolean;
  isActive: boolean;
  createdAt: string;
  modifiedAt?: string;
}

export const userManagementService = {
  /**
   * Get all registered system users directly from ERPNext User API
   */
  async getUsers(): Promise<UserRecord[]> {
    try {
      const fetchFields = [
        'name',
        'email',
        'first_name',
        'middle_name',
        'last_name',
        'full_name',
        'username',
        'enabled',
        'user_type',
        'language',
        'time_zone',
        'send_welcome_email',
        'phone',
        'mobile_no',
        'gender',
        'bio',
        'desk_theme',
        'mute_sounds',
        'creation',
        'modified',
      ];

      const response = await api.get<{ data: any[] }>(
        `/api/resource/User?fields=${encodeURIComponent(
          JSON.stringify(fetchFields)
        )}&limit_page_length=200&order_by=creation%20asc`
      );

      const erpUsers = response.data || [];

      return erpUsers
        .filter((u) => u.name !== 'Guest')
        .map((u) => {
          const normEmail = (u.email || u.name || '').toLowerCase();
          const normUsername = (u.username || u.name || '').toLowerCase();
          let role: PDMRole = 'teammember';
          let roleLabel = 'Team Member';

          if (normUsername === 'it_admin' || normEmail.includes('it_admin') || normEmail.includes('itadmin') || normEmail.includes('it.')) {
            role = 'it_admin';
            roleLabel = 'IT Admin';
          } else if (normUsername === 'administrator' || normEmail.includes('admin@')) {
            role = 'admin';
            roleLabel = 'Administrator';
          } else if (normEmail.includes('reviewer') || normEmail.includes('gate') || normEmail.includes('quality')) {
            role = 'gate_reviewer';
            roleLabel = 'Gate Reviewer';
          } else if (normEmail.includes('warehouse') || normEmail.includes('store') || normEmail.includes('stock')) {
            role = 'warehouse_user';
            roleLabel = 'Warehouse Manager';
          } else if (normEmail.includes('sarah') || normEmail.includes('manager') || normEmail.includes('pm')) {
            role = 'projectmanager';
            roleLabel = 'Project Manager';
          }

          const roleConfig = PDM_ROLE_PERMISSIONS[role];

          // For it_admin, display name is consistently "IT Admin"
          let displayName = u.full_name || u.first_name || u.name;
          if (role === 'it_admin' || normUsername === 'it_admin' || normEmail.includes('itadmin')) {
            displayName = 'IT Admin';
            roleLabel = 'IT Admin';
          } else if (role === 'admin' || normUsername === 'administrator') {
            displayName = 'Administrator';
          } else if (normEmail.includes('sarah')) {
            displayName = 'Sarah Jenkins';
          } else if (normEmail.includes('teammember') || normUsername === 'yash') {
            displayName = 'Yash';
          } else if (normEmail.includes('gatereviewer')) {
            displayName = 'Gate Reviewer';
          } else if (normEmail.includes('warehouse')) {
            displayName = 'Warehouse Manager';
          }

          return {
            username: u.username || u.name,
            email: u.email || u.name,
            fullName: displayName,
            first_name: u.first_name || '',
            middle_name: u.middle_name || '',
            last_name: u.last_name || '',
            role,
            roleLabel,
            department: role === 'it_admin' ? 'Information Technology' : 'Engineering',
            functionName: role === 'it_admin' ? 'IT' : 'Engineering',
            employeeId: `EMP-${(u.username || u.name).substring(0, 5).toUpperCase()}`,
            permissions: roleConfig.permissions,
            roles: [roleLabel],
            language: u.language || 'en',
            time_zone: u.time_zone || 'UTC',
            send_welcome_email: Boolean(u.send_welcome_email),
            phone: u.phone || '',
            mobile_no: u.mobile_no || '',
            gender: u.gender || '',
            bio: u.bio || '',
            desk_theme: u.desk_theme || 'Light',
            mute_sounds: Boolean(u.mute_sounds),
            isActive: Boolean(u.enabled),
            createdAt: u.creation || new Date().toISOString(),
            modifiedAt: u.modified || u.creation || new Date().toISOString(),
          };
        });
    } catch (error) {
      console.warn('[User Management Warning] Failed to fetch ERPNext users:', error);
      return [];
    }
  },

  /**
   * Get single user from ERPNext
   */
  async getUser(userId: string): Promise<UserRecord | null> {
    try {
      const response = await api.get<{ data: any }>(
        `/api/resource/User/${encodeURIComponent(userId)}`
      );
      const u = response.data;
      if (!u) return null;

      const users = await this.getUsers();
      return users.find((item) => item.username === u.name || item.email === u.email) || null;
    } catch (error) {
      console.error(`[User Management Error] Failed to get user ${userId}:`, error);
      return null;
    }
  },

  /**
   * Create real user in ERPNext User DocType (IT Admin workflow)
   */
  async addUser(input: CreateERPNextUserInput): Promise<UserRecord> {
    const email = input.email.trim();
    const firstName = (input.first_name || input.fullName || '').trim();

    if (!email) {
      throw new Error('Email is required.');
    }
    if (!firstName) {
      throw new Error('First Name is required.');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const existingUsers = await this.getUsers();

    const emailExists = existingUsers.some(
      (u) => u.email.toLowerCase().trim() === email.toLowerCase() || u.username.toLowerCase().trim() === email.toLowerCase()
    );
    if (emailExists) {
      throw new Error(`User with this email already exists.`);
    }

    if (input.username && input.username.trim()) {
      const usernameExists = existingUsers.some(
        (u) => u.username.toLowerCase().trim() === input.username!.toLowerCase().trim()
      );
      if (usernameExists) {
        throw new Error(`User with this username already exists.`);
      }
    }

    const erpRoleName =
      input.role === 'admin'
        ? 'System Manager'
        : input.role === 'it_admin'
          ? 'System Administrator'
          : input.role === 'projectmanager'
            ? 'Projects Manager'
            : input.role === 'gate_reviewer'
              ? 'Quality Manager'
              : input.role === 'warehouse_user'
                ? 'Stock Manager'
                : 'Projects User';

    const userPayload: Record<string, any> = {
      email,
      first_name: firstName,
      middle_name: input.middle_name ? input.middle_name.trim() : '',
      last_name: input.last_name ? input.last_name.trim() : '',
      username: input.username && input.username.trim() ? input.username.trim() : email.split('@')[0],
      enabled: input.enabled !== undefined ? (input.enabled ? 1 : 0) : 1,
      send_welcome_email: input.send_welcome_email ? 1 : 0,
      language: input.language || 'en',
      time_zone: input.time_zone || 'UTC',
      phone: input.phone || '',
      mobile_no: input.mobile_no || '',
      gender: input.gender || '',
      bio: input.bio || '',
      desk_theme: input.desk_theme || 'Light',
      mute_sounds: input.mute_sounds ? 1 : 0,
      user_type: 'System User',
      roles: [{ role: erpRoleName }, { role: 'Employee' }],
    };

    try {
      const response = await api.post<{ data: any }>('/api/resource/User', userPayload);
      const newErpUser = response.data;
      const roleConfig = PDM_ROLE_PERMISSIONS[input.role];

      return {
        username: newErpUser.name,
        email: newErpUser.email || email,
        fullName: newErpUser.full_name || `${firstName} ${input.last_name || ''}`.trim(),
        first_name: firstName,
        middle_name: input.middle_name || '',
        last_name: input.last_name || '',
        role: input.role,
        roleLabel: roleConfig.label,
        department: input.role === 'it_admin' ? 'Information Technology' : 'Engineering',
        functionName: input.role === 'it_admin' ? 'IT' : 'Engineering',
        employeeId: `EMP-${newErpUser.name.substring(0, 5).toUpperCase()}`,
        permissions: roleConfig.permissions,
        roles: [erpRoleName],
        language: input.language || 'en',
        time_zone: input.time_zone || 'UTC',
        send_welcome_email: Boolean(input.send_welcome_email),
        phone: input.phone || '',
        mobile_no: input.mobile_no || '',
        gender: input.gender || '',
        bio: input.bio || '',
        desk_theme: input.desk_theme || 'Light',
        mute_sounds: Boolean(input.mute_sounds),
        isActive: true,
        createdAt: newErpUser.creation || new Date().toISOString(),
        modifiedAt: newErpUser.modified || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[User Management Error] Failed to create user in ERPNext:', error);
      throw new Error(error.message || 'Failed to create user in ERPNext');
    }
  },

  /**
   * Update existing user in ERPNext
   */
  async updateUser(userId: string, input: UpdateERPNextUserInput): Promise<any> {
    const updatePayload: Record<string, any> = {};

    if (input.first_name !== undefined) updatePayload.first_name = input.first_name.trim();
    if (input.middle_name !== undefined) updatePayload.middle_name = input.middle_name.trim();
    if (input.last_name !== undefined) updatePayload.last_name = input.last_name.trim();
    if (input.enabled !== undefined) updatePayload.enabled = input.enabled ? 1 : 0;
    if (input.send_welcome_email !== undefined) updatePayload.send_welcome_email = input.send_welcome_email ? 1 : 0;
    if (input.language !== undefined) updatePayload.language = input.language;
    if (input.time_zone !== undefined) updatePayload.time_zone = input.time_zone;
    if (input.phone !== undefined) updatePayload.phone = input.phone;
    if (input.mobile_no !== undefined) updatePayload.mobile_no = input.mobile_no;
    if (input.gender !== undefined) updatePayload.gender = input.gender;
    if (input.bio !== undefined) updatePayload.bio = input.bio;
    if (input.desk_theme !== undefined) updatePayload.desk_theme = input.desk_theme;
    if (input.mute_sounds !== undefined) updatePayload.mute_sounds = input.mute_sounds ? 1 : 0;

    if (input.role) {
      const erpRoleName =
        input.role === 'admin'
          ? 'System Manager'
          : input.role === 'it_admin'
            ? 'System Administrator'
            : input.role === 'projectmanager'
              ? 'Projects Manager'
              : input.role === 'gate_reviewer'
                ? 'Quality Manager'
                : input.role === 'warehouse_user'
                  ? 'Stock Manager'
                  : 'Projects User';
      updatePayload.roles = [{ role: erpRoleName }, { role: 'Employee' }];
    }

    try {
      const response = await api.put<{ data: any }>(
        `/api/resource/User/${encodeURIComponent(userId)}`,
        updatePayload
      );
      return response.data;
    } catch (error: any) {
      console.error(`[User Management Error] Failed to update user ${userId}:`, error);
      throw new Error(error.message || `Failed to update user ${userId}`);
    }
  },

  /**
   * Toggle active/inactive status in ERPNext
   */
  async toggleUserStatus(userId: string, currentEnabledStatus: boolean): Promise<void> {
    try {
      await api.put(`/api/resource/User/${encodeURIComponent(userId)}`, {
        enabled: currentEnabledStatus ? 0 : 1,
      });
    } catch (error: any) {
      console.error(`[User Management Error] Failed to toggle status for ${userId}:`, error);
      throw error;
    }
  },
};
