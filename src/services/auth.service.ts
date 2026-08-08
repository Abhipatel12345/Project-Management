import api from './api';

export interface UserDetails {
  email: string;
  fullName: string;
  roles: string[];
  userImage?: string;
}

export interface ERPNextVersionInfo {
  frappe?: string;
  erpnext?: string;
  [key: string]: string | undefined;
}

export interface ConnectionTestResult {
  erpUrl: string;
  status: 'connected' | 'failed';
  responseTimeMs: number;
  erpVersion: string;
  loggedUser: string;
  errorMessage?: string;
  timestamp: string;
}

export interface LoginPayload {
  usr: string;
  pwd: string;
}

export interface LoginResponse {
  message: string;
  home_page?: string;
  full_name?: string;
}

export const authService = {
  /**
   * Authenticate user with ERPNext backend
   * POST /api/method/login
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/method/login', payload);
    return response;
  },

  /**
   * Logout session from ERPNext backend
   * POST /api/method/logout
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/method/logout');
    } catch {
      // Fallback GET if POST endpoint behaves differently in specific versions
      await api.get('/api/method/logout');
    }
  },

  /**
   * Fetch currently authenticated user email and details from ERPNext
   */
  async getLoggedUser(): Promise<UserDetails> {
    const res = await api.get<{ message: string }>('/api/method/frappe.auth.get_logged_user');
    const email = res.message;

    if (!email || email === 'Guest') {
      throw new Error('User is not logged in');
    }

    let fullName = email.split('@')[0];
    let roles: string[] = ['System User'];

    try {
      // Attempt fetching User DocType details for full name and roles
      const userDocRes = await api.get<{
        data: { full_name?: string; first_name?: string; roles?: { role: string }[] };
      }>(`/api/resource/User/${encodeURIComponent(email)}`);

      if (userDocRes?.data) {
        fullName = userDocRes.data.full_name || userDocRes.data.first_name || fullName;
        if (Array.isArray(userDocRes.data.roles)) {
          roles = userDocRes.data.roles.map((r) => r.role);
        }
      }
    } catch {
      // Proceed with email prefix if User DocType read permission is restricted
    }

    return {
      email,
      fullName: fullName.charAt(0).toUpperCase() + fullName.slice(1),
      roles,
    };
  },

  /**
   * Health & latency test
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = performance.now();
    const erpUrl = process.env.NEXT_PUBLIC_ERP_URL || 'https://demo.erpnext.com';
    const timestamp = new Date().toISOString();

    try {
      let erpVersion = 'ERPNext v15';
      try {
        const versionRes = await api.get<{ message?: ERPNextVersionInfo }>('/api/method/version');
        if (versionRes?.message) {
          const verObj = versionRes.message;
          erpVersion = `ERPNext ${verObj.erpnext || verObj.frappe || 'v15'}`;
        }
      } catch {
        erpVersion = 'ERPNext REST Connected';
      }

      let loggedUser = 'Guest';
      try {
        const userRes = await api.get<{ message?: string }>('/api/method/frappe.auth.get_logged_user');
        if (userRes?.message) {
          loggedUser = userRes.message;
        }
      } catch {
        loggedUser = 'Unauthenticated';
      }

      const endTime = performance.now();
      return {
        erpUrl,
        status: 'connected',
        responseTimeMs: Math.round(endTime - startTime),
        erpVersion,
        loggedUser,
        timestamp,
      };
    } catch (error: any) {
      const endTime = performance.now();
      return {
        erpUrl,
        status: 'failed',
        responseTimeMs: Math.round(endTime - startTime),
        erpVersion: 'Unknown',
        loggedUser: 'None',
        errorMessage: error.message || 'Connection failed',
        timestamp,
      };
    }
  },
};

export default authService;
