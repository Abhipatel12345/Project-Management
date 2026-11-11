import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.ERP_API_SECRET ||
  'pdm-enterprise-secure-session-salt-2026';

const API_KEY = process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
const API_SECRET = process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

export interface SignedSessionPayload {
  user: PDMUserSession;
  iat: number;
  exp: number;
}

/**
 * Sign a PDM user session into a tamper-proof cryptographic token (HMAC-SHA256)
 */
export function signSession(user: PDMUserSession, expiresInSeconds = 60 * 60 * 24 * 7): string {
  const payload: SignedSessionPayload = {
    user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode a cryptographic session token.
 * Returns null if the token is tampered, forged, or expired.
 */
export function verifySession(token: string): PDMUserSession | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr) as SignedSessionPayload;

    if (!payload || !payload.user || !payload.exp) return null;

    // Check expiration
    if (Date.now() / 1000 > payload.exp) {
      return null;
    }

    return normalizeSession(payload.user);
  } catch {
    return null;
  }
}

/**
 * Internal system admin session exclusively for authorized server-to-server operations
 * that supply the exact ERPNext master API token header.
 */
function getInternalServerAdminSession(): PDMUserSession {
  return {
    username: 'Administrator',
    email: 'admin@pdm.netlink.com',
    fullName: 'PDM System Administrator',
    role: 'admin',
    roleLabel: 'PMO / Administrator',
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
}

/**
 * Server-side session resolver from NextRequest.
 * Authenticates exclusively via:
 * 1. Cryptographically verified `pdm_session` cookie issued after ERPNext password authentication.
 * 2. Exact match of server Authorization master token (for internal server-to-server calls).
 *
 * NEVER falls back to Administrator or trusts client-supplied headers.
 */
export function getSessionFromRequest(
  req: NextRequest,
  _allowFallback = false
): PDMUserSession | null {
  // 1. Inspect pdm_session cookie
  const cookieVal = req.cookies.get('pdm_session')?.value;
  if (cookieVal) {
    const verified = verifySession(cookieVal);
    if (verified) {
      return verified;
    }
  }

  // 2. Inspect Server Authorization header (only if matching exact server API key & secret)
  const authHeader = req.headers.get('authorization');
  if (authHeader && API_KEY && API_SECRET) {
    const expectedToken = `token ${API_KEY}:${API_SECRET}`;
    if (authHeader.trim().toLowerCase() === expectedToken.toLowerCase()) {
      return getInternalServerAdminSession();
    }
  }

  // Never grant authentication to unauthenticated callers
  return null;
}

function normalizeSession(data: any): PDMUserSession {
  const isTeammember = data.role === 'teammember';
  return {
    username: data.username || data.email || 'user',
    email: data.email || (data.username ? `${data.username}@pdm.netlink.com` : 'user@pdm.netlink.com'),
    fullName: data.fullName || data.full_name || data.name || data.username || 'PDM User',
    role: data.role || 'teammember',
    roleLabel: data.roleLabel || data.role || 'Team Member',
    department: data.department || 'Engineering',
    functionName: data.functionName || data.department || 'Engineering',
    employeeId: data.employeeId || 'EMP-0000',
    permissions: {
      manageUsers: !!data.permissions?.manageUsers,
      manageProjects: isTeammember ? false : !!data.permissions?.manageProjects,
      manageTasks: isTeammember ? false : (data.permissions?.manageTasks ?? true),
      manageDeliverables: data.permissions?.manageDeliverables ?? true,
      manageTeamMembers: !!data.permissions?.manageTeamMembers,
      manageBoardMembers: !!data.permissions?.manageBoardMembers,
      manageProjectSettings: !!data.permissions?.manageProjectSettings,
      reviewGates: !!data.permissions?.reviewGates,
      approveGates: !!data.permissions?.approveGates,
      reviewDesign: !!data.permissions?.reviewDesign,
      approveDesign: !!data.permissions?.approveDesign,
      manageWarehouse: !!data.permissions?.manageWarehouse,
      viewReports: !!data.permissions?.viewReports,
    },
    userImage: data.userImage || data.user_image,
    roles: Array.isArray(data.roles) ? data.roles : [data.role || 'teammember'],
  };
}

/**
 * Universal async session helper for route handlers.
 * Returns null if no valid authenticated session is present.
 */
export async function getSessionUser(req?: NextRequest): Promise<PDMUserSession | null> {
  if (req) {
    return getSessionFromRequest(req, false);
  }
  return null;
}
