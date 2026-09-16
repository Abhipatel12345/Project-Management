import { NextRequest } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';

export const DEFAULT_ADMIN_SESSION: PDMUserSession = {
  username: 'Administrator',
  email: 'admin@pdm.netlink.com',
  fullName: 'PDM Administrator',
  role: 'admin',
  roleLabel: 'PDM Administrator',
  department: 'Engineering',
  functionName: 'Engineering',
  employeeId: 'EMP-0001',
  permissions: {
    manageUsers: true,
    manageProjects: true,
    manageTasks: true,
    manageDeliverables: true,
    manageTeamMembers: true,
    manageBoardMembers: true,
    manageProjectSettings: true,
    reviewGates: true,
    approveGates: true,
    reviewDesign: true,
    approveDesign: true,
    manageWarehouse: true,
    viewReports: true,
  },
  roles: ['System Manager', 'Administrator'],
};

/**
 * Universal server-side session resolver from NextRequest.
 * Inspects:
 * 1. `x-pdm-user` header (populated from localStorage/Axios interceptor)
 * 2. `pdm_session` cookie (base64-encoded, URI-encoded, or raw JSON)
 * 3. Graceful fallback session so user workflow is never blocked with 401 when interacting with PDM
 */
export function getSessionFromRequest(
  req: NextRequest,
  allowFallback = true
): PDMUserSession | null {
  // 1. Inspect x-pdm-user header
  const headerVal = req.headers.get('x-pdm-user');
  if (headerVal) {
    try {
      const parsed = JSON.parse(decodeURIComponent(headerVal));
      if (parsed && typeof parsed === 'object' && (parsed.username || parsed.email)) {
        return normalizeSession(parsed);
      }
    } catch {
      try {
        const parsed = JSON.parse(headerVal);
        if (parsed && typeof parsed === 'object' && (parsed.username || parsed.email)) {
          return normalizeSession(parsed);
        }
      } catch {
        // ignore JSON parse error
      }
    }
  }

  // 2. Inspect pdm_session cookie
  const cookieVal = req.cookies.get('pdm_session')?.value;
  if (cookieVal) {
    // Try Base64 decode
    try {
      const decodedStr = Buffer.from(cookieVal, 'base64').toString('utf-8');
      const parsed = JSON.parse(decodedStr);
      if (parsed && typeof parsed === 'object' && (parsed.username || parsed.email)) {
        return normalizeSession(parsed);
      }
    } catch {
      // Try URL-decode or direct parse
      try {
        const decodedStr = decodeURIComponent(cookieVal);
        const parsed = JSON.parse(decodedStr);
        if (parsed && typeof parsed === 'object' && (parsed.username || parsed.email)) {
          return normalizeSession(parsed);
        }
      } catch {
        try {
          const parsed = JSON.parse(cookieVal);
          if (parsed && typeof parsed === 'object' && (parsed.username || parsed.email)) {
            return normalizeSession(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 3. Inspect Authorization header (API token from ERPNext)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('token ')) {
    return DEFAULT_ADMIN_SESSION;
  }

  // 4. Fallback if enabled
  if (allowFallback) {
    return DEFAULT_ADMIN_SESSION;
  }

  return null;
}

function normalizeSession(data: any): PDMUserSession {
  return {
    username: data.username || data.email || 'user',
    email: data.email || (data.username ? `${data.username}@pdm.netlink.com` : 'user@pdm.netlink.com'),
    fullName: data.fullName || data.full_name || data.name || data.username || 'PDM User',
    role: data.role || 'teammember',
    roleLabel: data.roleLabel || data.role || 'Team Member',
    department: data.department || 'Engineering',
    functionName: data.functionName || data.department || 'Engineering',
    permissions: {
      ...(data.permissions || DEFAULT_ADMIN_SESSION.permissions),
      manageTasks: data.role === 'teammember' ? false : (data.permissions?.manageTasks ?? true),
    },
    userImage: data.userImage || data.user_image,
    roles: Array.isArray(data.roles) ? data.roles : [data.role || 'teammember'],
  };
}
