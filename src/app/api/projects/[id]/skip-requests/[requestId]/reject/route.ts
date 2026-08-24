import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import { rejectSkipRequest, getSkipRequestById } from '@/lib/server/skip-request-store';

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

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: projectId, requestId } = await props.params;
    const session = getSessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
    }

    // Only Project Manager or PMO Administrator can reject skip requests
    if (session.role !== 'projectmanager' && session.role !== 'admin') {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Only Project Managers or PMO Administrators can reject task skip requests.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { rejection_reason } = body;

    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim() === '') {
      return NextResponse.json(
        { _error_message: 'Rejection reason is required.' },
        { status: 400 }
      );
    }

    const existingReq = getSkipRequestById(requestId);
    if (!existingReq) {
      return NextResponse.json({ _error_message: 'Skip request not found.' }, { status: 404 });
    }

    // Mark request as REJECTED with rejection reason. Task remains active and in its previous state.
    const rejected = rejectSkipRequest(
      requestId,
      rejection_reason.trim(),
      session.email || session.username,
      session.fullName
    );

    return NextResponse.json({
      success: true,
      request: rejected,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to reject skip request' },
      { status: 400 }
    );
  }
}
