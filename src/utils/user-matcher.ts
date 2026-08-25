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
    gate_reviewer_user_id?: string;
    reviewer_user_id?: string;
    gate_reviewer?: string;
    reviewer?: string;
    custom_gate_reviewer?: string;
  } | null | undefined,
  user: PDMUserSession | { email?: string; username?: string; fullName?: string; employeeId?: string; id?: string } | null | undefined
): boolean {
  if (!gate || !user) return false;

  // 1. Check gate_reviewer_user_id / reviewer_user_id (preferred exact ID/email matching)
  if (gate.gate_reviewer_user_id && isUserMatch(gate.gate_reviewer_user_id, user)) {
    return true;
  }
  if (gate.reviewer_user_id && isUserMatch(gate.reviewer_user_id, user)) {
    return true;
  }

  // 2. Check gate_reviewer display name / email
  if (gate.gate_reviewer && isUserMatch(gate.gate_reviewer, user)) {
    return true;
  }

  // 3. Fallback to custom_gate_reviewer / reviewer field if present
  if (gate.custom_gate_reviewer && isUserMatch(gate.custom_gate_reviewer, user)) {
    return true;
  }
  if (gate.reviewer && isUserMatch(gate.reviewer, user)) {
    return true;
  }

  // 4. If user has role 'gate_reviewer' and the gate has generic/unassigned reviewer label
  if ((user as any).role === 'gate_reviewer') {
    const revStr = (
      gate.gate_reviewer_user_id ||
      gate.reviewer_user_id ||
      gate.gate_reviewer ||
      gate.reviewer ||
      gate.custom_gate_reviewer ||
      ''
    ).toLowerCase().trim();

    if (
      !revStr ||
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

/**
 * Return the specific RASIC role (R, A, S, C, I) if the user has a RASIC responsibility on the task.
 */
export function getUserRasicRole(
  task: { rasic?: { responsible?: string; accountable?: string; support?: string; consulted?: string; informed?: string }; description?: string } | null | undefined,
  user: PDMUserSession | { email?: string; username?: string; fullName?: string; employeeId?: string } | null | undefined
): { key: 'R' | 'A' | 'S' | 'C' | 'I'; label: string; field: string } | null {
  if (!task || !user) return null;

  let rasic = task.rasic;
  if (!rasic && task.description && task.description.includes('<!-- RASIC:')) {
    try {
      const match = task.description.match(/<!-- RASIC: (.*?) -->/);
      if (match && match[1]) {
        rasic = JSON.parse(match[1]);
      }
    } catch {
      // ignore
    }
  }

  if (!rasic) return null;

  if (isUserMatch(rasic.responsible, user)) return { key: 'R', label: 'Responsible (R)', field: 'responsible' };
  if (isUserMatch(rasic.accountable, user)) return { key: 'A', label: 'Accountable (A)', field: 'accountable' };
  if (isUserMatch(rasic.support, user)) return { key: 'S', label: 'Support (S)', field: 'support' };
  if (isUserMatch(rasic.consulted, user)) return { key: 'C', label: 'Consulted (C)', field: 'consulted' };
  if (isUserMatch(rasic.informed, user)) return { key: 'I', label: 'Informed (I)', field: 'informed' };

  return null;
}

