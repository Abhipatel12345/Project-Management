import api from './api';
import { UserDetails, LoginPayload, LoginResponse } from '@/types/auth.types';

export type { UserDetails, LoginPayload, LoginResponse };

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

export const authService = {
  /**
   * Authenticate user into isolated PDM session
   * POST /api/auth/pdm-login
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/pdm-login', payload);
    return response;
  },

  /**
   * Logout from PDM session (leaves ERPNext sid cookie untouched)
   * POST /api/auth/pdm-logout
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/pdm-logout');
    } catch {
      await api.get('/api/auth/pdm-logout');
    }
  },

  /**
   * Fetch currently authenticated PDM user session details
   * GET /api/auth/pdm-session
   */
  async getLoggedUser(): Promise<UserDetails> {
    try {
      const res = await api.get<{ message: string; user?: UserDetails }>('/api/auth/pdm-session');
      if (res && res.user) {
        return res.user;
      }
    } catch {
      // Fallback: Check localStorage if cookie read is delayed
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('pdm_user_session');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            // ignore
          }
        }
      }
    }
    throw new Error('User is not logged in to PDM');
  },

  /**
   * Health & ERPNext connection test
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = performance.now();
    const erpUrl = process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083';
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
        const sessionRes = await api.get<{ user?: UserDetails }>('/api/auth/pdm-session');
        if (sessionRes?.user?.email) {
          loggedUser = `${sessionRes.user.fullName} (${sessionRes.user.roleLabel})`;
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
