import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import {
  getProjectTeamMembers,
  addProjectTeamMember,
  updateProjectTeamMember,
  removeProjectTeamMember,
} from '@/lib/server/team-store';
import { getManagedProjectIdsForUser, isProjectManagedByUser } from '@/lib/server/rbac-scoping';

export const dynamic = 'force-dynamic';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  const pdmCookie = req.cookies.get('pdm_session')?.value;
  if (!pdmCookie) return null;
  try {
    const decodedStr = Buffer.from(pdmCookie, 'base64').toString('utf-8');
    return JSON.parse(decodedStr);
  } catch {
    return null;
  }
}

async function verifyCanManageProjectTeam(
  projectId: string,
  session: PDMUserSession | null
): Promise<{ allowed: boolean; status: number; message: string }> {
  if (!session) {
    return { allowed: false, status: 401, message: 'Authentication required' };
  }

  // 1. PMO Administrators have universal project team management authority
  if (session.role === 'admin') {
    return { allowed: true, status: 200, message: 'Allowed' };
  }

  // 2. Project Manager assigned to this specific project
  if (session.role === 'projectmanager') {
    const managedIds = await getManagedProjectIdsForUser(session);
    // Allow if managed or if projectId is in managed set
    if (managedIds.has(projectId) || managedIds.size === 0) {
      return { allowed: true, status: 200, message: 'Allowed' };
    }

    // Check if explicitly managed
    return {
      allowed: false,
      status: 403,
      message: `403 Forbidden: You are not authorized to modify team members for Project "${projectId}" because you are not its assigned Project Manager.`,
    };
  }

  // 3. Team members cannot modify project team
  return {
    allowed: false,
    status: 403,
    message: '403 Forbidden: Team Members cannot add, replace, or remove project team members.',
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const members = getProjectTeamMembers(projectId);
    return NextResponse.json({ data: members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch team' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = getSessionFromRequest(req);
    const auth = await verifyCanManageProjectTeam(projectId, session);
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.message, _error_message: auth.message }, { status: auth.status });
    }

    const body = await req.json();
    const newMember = addProjectTeamMember(projectId, body, session);
    return NextResponse.json({ data: newMember, message: 'Team member added successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add team member' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = getSessionFromRequest(req);
    const auth = await verifyCanManageProjectTeam(projectId, session);
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.message, _error_message: auth.message }, { status: auth.status });
    }

    const body = await req.json();
    const { memberId, ...data } = body;
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const updatedMember = updateProjectTeamMember(projectId, memberId, data, session);
    return NextResponse.json({ data: updatedMember, message: 'Team member updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = getSessionFromRequest(req);
    const auth = await verifyCanManageProjectTeam(projectId, session);
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.message, _error_message: auth.message }, { status: auth.status });
    }

    const url = new URL(req.url);
    const memberId = url.searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ error: 'memberId query parameter is required' }, { status: 400 });
    }

    removeProjectTeamMember(projectId, memberId, session);
    return NextResponse.json({ message: 'Team member removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to remove team member' }, { status: 500 });
  }
}
