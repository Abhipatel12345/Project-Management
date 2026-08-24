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

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const project = searchParams.get('project') || 'ALL';
    const search = searchParams.get('search') || undefined;

    const activities = getAuditRecordsByProject(project, search);

    return NextResponse.json({
      success: true,
      totalCount: activities.length,
      activities,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const record = saveAuditRecord({
      project_id: body.project_id || 'GLOBAL',
      user_id: body.user_id || session.email || session.username,
      user_name: body.user_name || session.fullName || session.username,
      role: body.role,
      action: body.action || 'System Event',
      entity_type: body.entity_type || 'Project',
      entity_id: body.entity_id || 'SYS-001',
      description: body.description || '',
      old_value: body.old_value,
      new_value: body.new_value,
    });

    return NextResponse.json({
      success: true,
      activity: record,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
