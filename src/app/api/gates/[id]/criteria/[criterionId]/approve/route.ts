import { NextRequest, NextResponse } from 'next/server';
import { executeCriterionApprovalAction } from '@/lib/server/gate-store';
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
  context: { params: Promise<{ id: string; criterionId: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to approve gate exit criterion.' },
        { status: 401 }
      );
    }

    const { id, criterionId } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const critId = decodeURIComponent(criterionId || '');

    const { gate, criterion } = executeCriterionApprovalAction(gateName, critId, session);

    return NextResponse.json({
      success: true,
      message: `Exit criterion ${critId} approved successfully for Gate ${gateName}`,
      gate,
      criterion,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || (error.message?.includes('403') ? 403 : 500);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to approve criterion', error: error.message },
      { status: statusCode }
    );
  }
}
