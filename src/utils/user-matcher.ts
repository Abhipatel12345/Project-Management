import { PDMUserSession } from '@/types/auth.types';

/**
 * Universal dynamic user matching.
 * Compares any target string/id (email, username, full name, employeeId) against user session.
 */
export function isUserMatch(
  targetStr: string | null | undefined,
  user: PDMUserSession | { email?: string; username?: string; fullName?: string; employeeId?: string } | null | undefined
): boolean {
  if (!targetStr || !user) return false;
  const target = targetStr.toLowerCase().trim();
  if (!target || target === 'unassigned' || target === 'none') return false;

  const userEmail = (user.email || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const fullName = (user.fullName || '').toLowerCase().trim();
  const emailPrefix = userEmail.includes('@') ? userEmail.split('@')[0].toLowerCase().trim() : '';
  const empId = (user.employeeId || '').toLowerCase().trim();

  // 1. Exact match against identifier or email or username or full name
  if (
    target === userEmail ||
    target === username ||
    target === fullName ||
    (emailPrefix && target === emailPrefix) ||
    (empId && target === empId)
  ) {
    return true;
  }

  // 2. Formatted as "Full Name (email@domain.com)" or "email@domain.com"
  if (userEmail && target.includes(userEmail)) return true;
  if (username && username.length >= 3 && target.includes(username)) return true;
  if (fullName && fullName.length >= 3 && (target.includes(fullName) || fullName.includes(target))) return true;
  if (emailPrefix && emailPrefix.length >= 3 && (target.includes(emailPrefix) || emailPrefix.includes(target))) return true;

  return false;
}

/**
 * Check if the user is the assigned Gate Reviewer for the specified Gate
 */
export function isGateReviewer(
  gate: {
    reviewer_user_id?: string;
    gate_reviewer?: string;
    reviewer?: string;
  } | null | undefined,
  user: PDMUserSession | { email?: string; username?: string; fullName?: string; employeeId?: string } | null | undefined
): boolean {
  if (!gate || !user) return false;

  // 1. Check reviewer_user_id (preferred exact ID/email matching)
  if (gate.reviewer_user_id) {
    if (isUserMatch(gate.reviewer_user_id, user)) return true;
  }

  // 2. Check gate_reviewer display name / email
  if (gate.gate_reviewer) {
    if (isUserMatch(gate.gate_reviewer, user)) return true;
  }

  // 3. Fallback to reviewer field if present
  if (gate.reviewer) {
    if (isUserMatch(gate.reviewer, user)) return true;
  }

  // 4. If user is system Gate Reviewer and the gate reviewer label is generic
  if ((user as any).role === 'gate_reviewer') {
    const revStr = (gate.gate_reviewer || gate.reviewer_user_id || gate.reviewer || '').toLowerCase().trim();
    if (
      revStr === 'gate reviewer' ||
      revStr === 'gate_reviewer' ||
      revStr === 'quality reviewer' ||
      revStr === 'quality manager' ||
      revStr === 'gate board' ||
      revStr === 'review board'
    ) {
      return true;
    }
  }

  return false;
}
