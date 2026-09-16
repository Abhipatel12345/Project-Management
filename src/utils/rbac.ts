import { PDMUserSession } from '@/types/auth.types';

/**
 * Universal dynamic user matching.
 * Compares any target string (email, username, full name, employeeId) against authenticated user session.
 * NO HARDCODED USERNAME RESTRICTIONS.
 */
export function isUserMatch(
  targetStr: string | null | undefined,
  session: PDMUserSession | null | undefined
): boolean {
  if (!targetStr || !session) return false;
  const target = targetStr.toLowerCase().trim();
  if (!target || target === 'unassigned' || target === 'none') return false;

  const userEmail = (session.email || '').toLowerCase().trim();
  const username = (session.username || '').toLowerCase().trim();
  const fullName = (session.fullName || '').toLowerCase().trim();
  const emailPrefix = userEmail.includes('@') ? userEmail.split('@')[0].toLowerCase().trim() : '';
  const empId = (session.employeeId || '').toLowerCase().trim();

  // Exact match
  if (
    target === userEmail ||
    target === username ||
    target === fullName ||
    (emailPrefix && target === emailPrefix) ||
    (empId && target === empId)
  ) {
    return true;
  }

  // Target formatted as "Full Name (email@domain.com)" or "email@domain.com"
  if (userEmail && target.includes(userEmail)) return true;
  if (username && username.length >= 3 && target.includes(username)) return true;
  if (fullName && fullName.length >= 3 && (target.includes(fullName) || fullName.includes(target))) return true;
  if (emailPrefix && emailPrefix.length >= 3 && (target.includes(emailPrefix) || emailPrefix.includes(target))) return true;

  return false;
}

/**
 * Check if a task is assigned to the authenticated user.
 */
export function isTaskAssignedToUser(task: any, session: PDMUserSession | null | undefined): boolean {
  if (!task || !session) return false;

  // 1. Check assigned_to field
  if (task.assigned_to && isUserMatch(task.assigned_to, session)) {
    return true;
  }

  // 2. Check assigned_employee_name
  if (task.assigned_employee_name && isUserMatch(task.assigned_employee_name, session)) {
    return true;
  }

  // 3. Check _assign JSON array from ERPNext
  if (task._assign) {
    try {
      const arr = typeof task._assign === 'string' ? JSON.parse(task._assign) : task._assign;
      if (Array.isArray(arr)) {
        if (arr.some((a) => isUserMatch(a, session))) return true;
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // 4. Check owner/creator
  if (task.owner && isUserMatch(task.owner, session)) {
    return true;
  }

  // 5. Check direct rasic object on task
  if (task.rasic && typeof task.rasic === 'object') {
    const { responsible, accountable, support, consulted, informed } = task.rasic;
    if (
      isUserMatch(responsible, session) ||
      isUserMatch(accountable, session) ||
      isUserMatch(support, session) ||
      isUserMatch(consulted, session) ||
      isUserMatch(informed, session)
    ) {
      return true;
    }
  }

  // 6. Check individual rasic fields
  if (
    isUserMatch(task.rasic_responsible, session) ||
    isUserMatch(task.rasic_accountable, session) ||
    isUserMatch(task.rasic_support, session) ||
    isUserMatch(task.rasic_consulted, session) ||
    isUserMatch(task.rasic_informed, session)
  ) {
    return true;
  }

  // 7. Check embedded <!-- RASIC: ... --> in task.description
  if (task.description && typeof task.description === 'string' && task.description.includes('<!-- RASIC:')) {
    try {
      const match = task.description.match(/<!-- RASIC: (.*?) -->/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (
          isUserMatch(parsed.responsible, session) ||
          isUserMatch(parsed.accountable, session) ||
          isUserMatch(parsed.support, session) ||
          isUserMatch(parsed.consulted, session) ||
          isUserMatch(parsed.informed, session)
        ) {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}
