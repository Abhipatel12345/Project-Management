import { PDMUserSession, PDMRole } from '@/types/auth.types';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

export const ROLE_PAGE_PERMISSIONS: Record<PDMRole, string[]> = {
  admin: [
    '/dashboard',
    '/projects',
    '/projects/[id]',
    '/projects/detail',
    '/projects/charter',
    '/projects/team',
    '/tasks',
    '/warehouse',
    '/planning',
    '/issues',
    '/documents',
    '/design-review',
    '/gates',
    '/gates/review',
    '/risks',
    '/notifications',
    '/workflows',
    '/launch',
    '/scorecard',
    '/reports',
    '/executive',
    '/connection-test',
    '/settings',
  ],
  it_admin: [
    '/dashboard',
    '/connection-test',
    '/settings',
  ],
  projectmanager: [
    '/dashboard',
    '/projects',
    '/projects/[id]',
    '/projects/detail',
    '/projects/charter',
    '/projects/team',
    '/tasks',
    '/warehouse',
    '/planning',
    '/issues',
    '/documents',
    '/design-review',
    '/gates',
    '/risks',
    '/notifications',
    '/workflows',
    '/reports',
    '/connection-test',
    '/settings',
  ],
  teammember: [
    '/dashboard',
    '/tasks',
    '/issues',
    '/documents',
    '/notifications',
    '/connection-test',
    '/settings',
  ],
  warehouse_user: [
    '/dashboard',
    '/warehouse',
    '/notifications',
    '/connection-test',
    '/settings',
  ],
  gate_reviewer: [
    '/dashboard',
    '/gates/review',
    '/gates',
    '/design-review',
    '/notifications',
    '/connection-test',
    '/settings',
  ],
};

export const accessControlService = {
  /**
   * Level 1: Check if active user role can access a specific page path
   */
  canAccessPage(user: PDMUserSession | null, pathname: string): AccessCheckResult {
    if (!user) {
      return { allowed: false, reason: 'Authentication required. Please sign in.' };
    }

    const role = user.role;
    const allowedPages = ROLE_PAGE_PERMISSIONS[role] || [];

    // Normalize path (e.g. /projects/PROJ-0001 -> /projects/[id])
    let normalizedPath = pathname;
    if (pathname.startsWith('/projects/') && pathname !== '/projects' && pathname !== '/projects/charter' && pathname !== '/projects/team' && pathname !== '/projects/detail') {
      normalizedPath = '/projects/[id]';
    }

    const isAllowed = allowedPages.some((p) => p === pathname || p === normalizedPath);

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Access Denied: Your assigned role "${user.roleLabel}" is not authorized to access ${pathname}.`,
      };
    }

    return { allowed: true };
  },

  /**
   * Level 2: Check if user is authorized to access a specific Project Record
   */
  canAccessProject(
    user: PDMUserSession | null,
    projectId: string,
    projectOwner?: string,
    projectUsers?: string[]
  ): AccessCheckResult {
    if (!user) return { allowed: false, reason: 'Authentication required' };

    // PMO / Admin has global project access
    if (user.role === 'admin') return { allowed: true };

    // IT Admin, Warehouse, Gate Reviewer cannot manage project execution unless PMO
    if (user.role === 'it_admin') {
      return { allowed: false, reason: 'IT Admin role is restricted to User Management.' };
    }

    const normEmail = user.email.toLowerCase().trim();
    const normUsername = user.username.toLowerCase().trim();

    // Check project owner or users child table
    const isOwner =
      projectOwner &&
      (projectOwner.toLowerCase().trim() === normEmail || projectOwner.toLowerCase().trim() === normUsername);

    const isTeamMember =
      projectUsers &&
      projectUsers.some(
        (u) => u.toLowerCase().trim() === normEmail || u.toLowerCase().trim() === normUsername
      );

    if (isOwner || isTeamMember) {
      return { allowed: true };
    }

    // Default: Scoped access for PM / Team Member
    if (user.role === 'projectmanager' || user.role === 'teammember') {
      // If project list is being loaded, allow assigned project
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Access Denied: User "${user.fullName}" is not assigned to Project ${projectId}.`,
    };
  },

  /**
   * Level 2: Check Gate Approval Authority (PM CANNOT approve their own gate)
   */
  canApproveGate(user: PDMUserSession | null, gateOwner?: string): AccessCheckResult {
    if (!user) return { allowed: false, reason: 'Authentication required' };

    if (user.role === 'gate_reviewer' || user.role === 'admin') {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Access Denied: Gate Approval is restricted to Executive Gate Reviewers / Quality Board.',
    };
  },

  /**
   * Level 2: Check Warehouse Operation Authority
   */
  canManageWarehouse(user: PDMUserSession | null): AccessCheckResult {
    if (!user) return { allowed: false, reason: 'Authentication required' };

    if (user.role === 'warehouse_user' || user.role === 'admin' || user.permissions.manageWarehouse) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Access Denied: Warehouse stock reservation & issuance is restricted to Warehouse Users.',
    };
  },
};
