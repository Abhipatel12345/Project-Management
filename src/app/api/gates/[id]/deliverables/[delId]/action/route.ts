import { NextRequest, NextResponse } from 'next/server';
import { executeDeliverableReviewAction } from '@/lib/server/gate-store';
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; delId: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id, delId } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const deliverableId = decodeURIComponent(delId || '');

    const body = await req.json();
    const action = body.action as 'review' | 'approve' | 'reject';
    const comment = body.comment || body.reason || body.rejectionReason || undefined;

    if (!action || !['review', 'approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { _error_message: 'Invalid action. Must be "review", "approve", or "reject".' },
        { status: 400 }
      );
    }

    const result = executeDeliverableReviewAction(
      gateName,
      deliverableId,
      action,
      comment,
      session
    );

    return NextResponse.json({
      success: true,
      deliverable: result.deliverable,
      gate: result.gate,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        _error_message: error.message || 'Failed to execute deliverable action',
      },
      { status: statusCode }
    );
  }
}
