import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import {
  getSkipRequestsByProject,
  createSkipRequest,
} from '@/lib/server/skip-request-store';

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

/**
 * GET /api/projects/:id/skip-requests
 * Fetch all skip requests for the specified project
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const projectId = decodeURIComponent(id || '');

    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
    }

    const access = accessControlService.canAccessProject(session, projectId);
    if (!access.allowed) {
      return NextResponse.json({ _error_message: access.reason || '403 Forbidden' }, { status: 403 });
    }

    const requests = getSkipRequestsByProject(projectId);
    return NextResponse.json({
      success: true,
      projectId,
      requests,
      totalCount: requests.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch skip requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/:id/skip-requests
 * Team Member submits a skip request with mandatory reason
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const projectId = decodeURIComponent(id || '');

    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { task_id, task_subject, skip_reason, additional_comment } = body;

    if (!task_id) {
      return NextResponse.json({ _error_message: 'Task ID is required' }, { status: 400 });
    }

    if (!skip_reason || typeof skip_reason !== 'string' || skip_reason.trim() === '') {
      return NextResponse.json(
        { _error_message: 'Please provide a reason for requesting this task to be skipped.' },
        { status: 400 }
      );
    }

    const created = createSkipRequest({
      task_id,
      task_subject: task_subject || task_id,
      project_id: projectId,
      requested_by: session.email || session.username,
      requested_by_name: session.fullName,
      skip_reason: skip_reason.trim(),
      additional_comment: additional_comment?.trim(),
    });

    return NextResponse.json({
      success: true,
      request: created,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to submit skip request' },
      { status: 400 }
    );
  }
}
