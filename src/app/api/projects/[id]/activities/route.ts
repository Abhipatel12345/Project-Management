import { NextRequest, NextResponse } from 'next/server';
import { getAuditRecordsByProject, saveAuditRecord } from '@/lib/server/audit-store';
import { PDMUserSession } from '@/types/auth.types';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (!cookie) return null;
    const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const projectId = decodeURIComponent(id || '');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const activities = getAuditRecordsByProject(projectId, search);

    return NextResponse.json({
      success: true,
      projectId,
      totalCount: activities.length,
      activities,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch project activities' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const projectId = decodeURIComponent(id || '');
    const body = await req.json();

    const record = saveAuditRecord({
      project_id: projectId || body.project_id || 'GLOBAL',
      user_id: body.user_id || session.email || session.username,
      user_name: body.user_name || session.fullName || session.username,
      role: body.role,
      action: body.action || 'Updated Record',
      entity_type: body.entity_type || 'Project',
      entity_id: body.entity_id || projectId,
      description: body.description || 'System event recorded',
      old_value: body.old_value,
      new_value: body.new_value,
    });

    return NextResponse.json({
      success: true,
      activity: record,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create audit activity' },
      { status: 500 }
    );
  }
}
