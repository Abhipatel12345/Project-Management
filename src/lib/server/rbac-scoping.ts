import { PDMUserSession } from '@/types/auth.types';

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

/**
 * Universal dynamic user matching.
 * Compares any target string (email, username, full name, employeeId) against authenticated user session.
 * NO HARDCODED NAMES.
 */
export function isUserMatch(targetStr: string | null | undefined, session: PDMUserSession): boolean {
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
export function isTaskAssignedToUser(task: any, session: PDMUserSession): boolean {
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

/**
 * Check if a project is managed by or assigned to the user.
 */
export function isProjectManagedByUser(project: any, session: PDMUserSession): boolean {
  if (!project || !session) return false;

  // 1. Check owner field
  if (project.owner && isUserMatch(project.owner, session)) {
    return true;
  }

  // 2. Check project manager field if present
  const pmField = project.project_manager || project.project_manager_id || project.custom_project_manager;
  if (pmField && isUserMatch(pmField, session)) {
    return true;
  }

  // 3. Check project users child table
  const users = project.users || [];
  if (Array.isArray(users)) {
    const isMatchedInUsers = users.some((u: any) => {
      const uEmail = u.user || u.email;
      const uName = u.full_name;
      return isUserMatch(uEmail, session) || isUserMatch(uName, session);
    });
    if (isMatchedInUsers) return true;
  }

  return false;
}

/**
 * Fetch all raw projects from ERPNext VM with caching
 */
export async function fetchAllProjectsFromERP(): Promise<any[]> {
  try {
    const erpUrl = getErpUrl();
    const headers = {
      Authorization: `token ${getApiKey()}:${getApiSecret()}`,
      Accept: 'application/json',
    };
    const res = await fetch(
      `${erpUrl}/api/resource/Project?fields=["name","project_name","status","priority","percent_complete","owner","creation","modified"]&limit_page_length=500&order_by=modified desc`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('[RBAC] fetchAllProjectsFromERP failed:', err);
    return [];
  }
}

/**
 * Fetch all raw tasks from ERPNext VM
 */
export async function fetchAllTasksFromERP(): Promise<any[]> {
  try {
    const erpUrl = getErpUrl();
    const headers = {
      Authorization: `token ${getApiKey()}:${getApiSecret()}`,
      Accept: 'application/json',
    };
    const res = await fetch(
      `${erpUrl}/api/resource/Task?fields=["name","subject","project","status","priority","exp_start_date","exp_end_date","progress","description","owner","_assign","modified"]&limit_page_length=1000&order_by=modified desc`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('[RBAC] fetchAllTasksFromERP failed:', err);
    return [];
  }
}

/**
 * Get Set of Project Identifiers managed by a Project Manager
 */
export async function getManagedProjectIdsForUser(session: PDMUserSession): Promise<Set<string>> {
  const managedIds = new Set<string>();
  if (session.role === 'admin') {
    return managedIds; // Admin has universal access
  }

  const allProjects = await fetchAllProjectsFromERP();

  for (const proj of allProjects) {
    if (isProjectManagedByUser(proj, session)) {
      managedIds.add(proj.name);
      if (proj.project_name) managedIds.add(proj.project_name);
    }
  }

  // If a PM has created/managed tasks in a project, also include that project
  const allTasks = await fetchAllTasksFromERP();
  for (const task of allTasks) {
    if (isUserMatch(task.owner, session) && task.project) {
      managedIds.add(task.project);
    }
  }

  return managedIds;
}

/**
 * Get Set of Project Identifiers accessible to a Team Member
 * (projects where team member has assigned tasks or is in project users)
 */
export async function getAccessibleProjectIdsForTeamMember(session: PDMUserSession): Promise<Set<string>> {
  const accessibleIds = new Set<string>();
  if (session.role === 'admin') {
    return accessibleIds;
  }

  // 1. Check projects through task assignment
  const allTasks = await fetchAllTasksFromERP();
  for (const task of allTasks) {
    if (isTaskAssignedToUser(task, session) && task.project) {
      accessibleIds.add(task.project);
    }
  }

  // 3. Check persistent project team members store
  try {
    const { loadAllProjectTeams } = await import('./team-store');
    const allTeams = loadAllProjectTeams();
    for (const [projId, members] of Object.entries(allTeams)) {
      if (
        members.some(
          (m) =>
            isUserMatch(m.user_email, session) ||
            isUserMatch(m.employee_name, session)
        )
      ) {
        accessibleIds.add(projId);
      }
    }
  } catch {
    // non-blocking
  }

  return accessibleIds;
}
