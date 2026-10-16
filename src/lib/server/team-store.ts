import fs from 'fs';
import path from 'path';
import { ProjectTeamMember, TeamMemberFormData } from '@/types/team.types';
import { PDMUserSession } from '@/types/auth.types';
import { saveAuditRecord } from './audit-store';
import { updateErpDoc, fetchErpResource } from './erp-client';

const DATA_DIR = path.join(process.cwd(), '.data');
const TEAMS_FILE = path.join(DATA_DIR, 'project-teams.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function syncTeamToERPNext(projectId: string, members: ProjectTeamMember[]) {
  try {
    const validUsers = await fetchErpResource<{ name: string; email: string }>('User', {
      fields: ['name', 'email'],
      limit: 1000,
    });
    const validUserSet = new Set(
      validUsers.flatMap((u) => [u.name.toLowerCase(), (u.email || '').toLowerCase()])
    );

    const updatedUsers = members
      .filter((m) => validUserSet.has((m.user_email || '').toLowerCase()))
      .map((m) => {
        const matched = validUsers.find(
          (u) =>
            u.name.toLowerCase() === (m.user_email || '').toLowerCase() ||
            (u.email || '').toLowerCase() === (m.user_email || '').toLowerCase()
        );
        return {
          user: matched?.name || m.user_email,
          email: m.user_email,
          full_name: m.employee_name,
          custom_role: m.role || '',
          custom_department: m.department || '',
          custom_function: m.function_name || '',
          custom_is_board_member: m.is_board_member ? 1 : 0,
          welcome_email_sent: 1,
        };
      });

    if (updatedUsers.length > 0) {
      await updateErpDoc('Project', projectId, { users: updatedUsers });
    }
  } catch (err: any) {
    console.warn(`[TeamStore] Failed to sync team to ERPNext for ${projectId}:`, err.message);
  }
}

export function loadAllProjectTeams(): Record<string, ProjectTeamMember[]> {
  ensureDataDir();
  if (!fs.existsSync(TEAMS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(TEAMS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[TeamStore] Failed to read project-teams.json:', err);
    return {};
  }
}

export function saveAllProjectTeams(data: Record<string, ProjectTeamMember[]>): void {
  ensureDataDir();
  try {
    fs.writeFileSync(TEAMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[TeamStore] Failed to write project-teams.json:', err);
  }
}

export function getProjectTeamMembers(projectId: string): ProjectTeamMember[] {
  const allTeams = loadAllProjectTeams();
  return allTeams[projectId] || [];
}

export function addProjectTeamMember(
  projectId: string,
  data: TeamMemberFormData,
  session?: PDMUserSession | null
): ProjectTeamMember {
  const allTeams = loadAllProjectTeams();
  const currentMembers = allTeams[projectId] || [];

  const newMember: ProjectTeamMember = {
    id: `TM-${projectId}-${Date.now()}`,
    project_id: projectId,
    user_email: data.user_email,
    employee_name: data.employee_name,
    department: data.department || 'Engineering',
    function_name: data.function_name || 'Lead Engineering',
    role: data.role || 'Design Engineer',
    is_board_member: Boolean(data.is_board_member),
    status: data.status || 'Active',
    creation: new Date().toISOString(),
  };

  // Prepend new member
  allTeams[projectId] = [newMember, ...currentMembers];
  saveAllProjectTeams(allTeams);

  // Sync to ERPNext
  syncTeamToERPNext(projectId, allTeams[projectId]).catch((err) => {
    console.warn('[TeamStore] Async ERP sync error:', err);
  });

  if (session) {
    saveAuditRecord({
      project_id: projectId,
      action: 'TEAM_MEMBER_ADDED',
      entity_type: 'Team',
      entity_id: newMember.id,
      user_id: session.email || session.username,
      user_name: session.fullName || session.username,
      description: `Added ${newMember.employee_name} (${newMember.role}) to Project ${projectId}`,
    });
  }

  return newMember;
}

export function updateProjectTeamMember(
  projectId: string,
  memberId: string,
  data: Partial<TeamMemberFormData>,
  session?: PDMUserSession | null
): ProjectTeamMember {
  const allTeams = loadAllProjectTeams();
  const currentMembers = allTeams[projectId] || [];
  const idx = currentMembers.findIndex((m) => m.id === memberId);

  if (idx === -1) {
    throw new Error(`Team member ${memberId} not found in project ${projectId}`);
  }

  const updated: ProjectTeamMember = {
    ...currentMembers[idx],
    ...data,
    modified: new Date().toISOString(),
  };

  currentMembers[idx] = updated;
  allTeams[projectId] = currentMembers;
  saveAllProjectTeams(allTeams);

  // Sync to ERPNext
  syncTeamToERPNext(projectId, allTeams[projectId]).catch((err) => {
    console.warn('[TeamStore] Async ERP sync error:', err);
  });

  if (session) {
    saveAuditRecord({
      project_id: projectId,
      action: 'TEAM_MEMBER_UPDATED',
      entity_type: 'Team',
      entity_id: memberId,
      user_id: session.email || session.username,
      user_name: session.fullName || session.username,
      description: `Updated ${updated.employee_name} in Project ${projectId}`,
    });
  }

  return updated;
}

export function removeProjectTeamMember(
  projectId: string,
  memberId: string,
  session?: PDMUserSession | null
): boolean {
  const allTeams = loadAllProjectTeams();
  const currentMembers = allTeams[projectId] || [];
  const member = currentMembers.find((m) => m.id === memberId);

  allTeams[projectId] = currentMembers.filter((m) => m.id !== memberId);
  saveAllProjectTeams(allTeams);

  // Sync to ERPNext
  syncTeamToERPNext(projectId, allTeams[projectId]).catch((err) => {
    console.warn('[TeamStore] Async ERP sync error:', err);
  });

  if (session && member) {
    saveAuditRecord({
      project_id: projectId,
      action: 'TEAM_MEMBER_REMOVED',
      entity_type: 'Team',
      entity_id: memberId,
      user_id: session.email || session.username,
      user_name: session.fullName || session.username,
      description: `Removed ${member.employee_name} from Project ${projectId}`,
    });
  }

  return true;
}
